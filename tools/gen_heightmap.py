#!/usr/bin/env python3
"""
gen_heightmap.py, step 1 of the terrain pipeline: the base heightmap.

Makes a square, seamlessly tileable heightmap as a Gaussian random field:
white noise is filtered in the frequency domain with a power-law spectrum,
then transformed back. Because the FFT is periodic, the result wraps around
on all four edges with no seam (the map is a torus), so a lookup of the form
    h[(y % N) * N + (x % N)]
is effectively infinite.

Output (default folder tools/out/, not part of the game):
    heightmap_<seed>_<size>.npy   float32, shape (N, N), values in [0, 1]
    heightmap_<seed>_<size>.png   8-bit grayscale preview (downsampled if big)

Requires only numpy (PNG is written with the standard library).

Examples:
    python tools/gen_heightmap.py --seed 7
    python tools/gen_heightmap.py --seed 7 --size 4096 --min-feature 12
    python tools/gen_heightmap.py --seed 7 --preview-tiles 2   (eyeball the wrap)

Knobs:
    --beta         spectral slope. Higher = smoother, bigger landforms.
                   2 = rough, 3 = brownian-like terrain, 3.2 = default, 4 = very smooth.
    --max-feature  remove the longest wavelengths so no one landform spans the map.
    --erode N      run N erosion droplets (carves valleys and ridges); see --relief.
    --min-feature  smallest landform in tiles. Detail finer than this is
                   smoothed away (a Gaussian low-pass). Plateaus smaller than
                   ~30 tiles are hard to use with the game camera, so
                   quantizing later works best with a fairly large value.
"""
import argparse
import json
import os
import struct
import sys
import zlib

import numpy as np


def make_heightmap(size, seed, beta=3.0, min_feature=8.0, max_feature=0.0):
    """Return a (size, size) float32 array in [0, 1] that tiles seamlessly."""
    rng = np.random.default_rng(seed)
    white = rng.standard_normal((size, size))
    spec = np.fft.rfft2(white)

    # Radial frequency in cycles per tile, for the half-spectrum from rfft2.
    fy = np.fft.fftfreq(size)[:, None]
    fx = np.fft.rfftfreq(size)[None, :]
    k = np.hypot(fx, fy)
    k[0, 0] = 1.0  # avoid divide by zero, the DC term is zeroed below

    # Power ~ k^-beta, so amplitude ~ k^(-beta/2).
    filt = k ** (-beta / 2.0)
    if min_feature and min_feature > 0:
        kc = 1.0 / float(min_feature)
        filt *= np.exp(-(k / kc) ** 2)
    if max_feature and max_feature > 0:
        kl = 1.0 / float(max_feature)  # remove wavelengths longer than this
        filt *= 1.0 - np.exp(-(k / kl) ** 2)
    filt[0, 0] = 0.0  # no constant offset, normalized below anyway

    h = np.fft.irfft2(spec * filt, s=(size, size))

    lo, hi = h.min(), h.max()
    h = (h - lo) / (hi - lo)
    return h.astype(np.float32)


def _bilinear(Hf, n, x, y):
    """Bilinear height sample on a wrapping grid, plus the corner info."""
    xi = np.floor(x).astype(np.int64)
    yi = np.floor(y).astype(np.int64)
    fx = x - xi
    fy = y - yi
    x0 = xi % n
    x1 = (xi + 1) % n
    y0 = yi % n
    y1 = (yi + 1) % n
    i00 = y0 * n + x0
    i10 = y0 * n + x1
    i01 = y1 * n + x0
    i11 = y1 * n + x1
    h00, h10, h01, h11 = Hf[i00], Hf[i10], Hf[i01], Hf[i11]
    h = h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy
    gx = (h10 - h00) * (1 - fy) + (h11 - h01) * fy
    gy = (h01 - h00) * (1 - fx) + (h11 - h10) * fx
    return h, gx, gy, (i00, i10, i01, i11), fx, fy


def erode(h, drops, seed, relief=150.0, batch=4000, lifetime=40, inertia=0.05,
          capacity=4.0, deposition=0.3, erosion=0.3, evaporation=0.01,
          gravity=4.0, min_slope=0.01):
    """
    Particle hydraulic erosion on a wrapping grid, vectorized: `batch` droplets
    run at once. Each droplet rolls downhill, picks up sediment on steep ground
    and drops it where it slows. Over many droplets this carves valleys and
    ridges with branching drainage. `relief` is the height range in tile units
    (bigger = steeper, so more erosion). Returns an array in [0, 1].
    """
    n = h.shape[0]
    rng = np.random.default_rng(seed + 1_000_003)
    Hf = (h.astype(np.float64) * relief).ravel().copy()
    step_cap = 0.02 * relief
    done = 0
    while done < drops:
        m = min(batch, drops - done)
        done += m
        x = rng.random(m) * n
        y = rng.random(m) * n
        dx = np.zeros(m)
        dy = np.zeros(m)
        speed = np.ones(m)
        water = np.ones(m)
        sed = np.zeros(m)
        ero_i, ero_w, dep_i, dep_w = [], [], [], []
        for _ in range(lifetime):
            h0, gx, gy, idx, fx, fy = _bilinear(Hf, n, x, y)
            dx = dx * inertia - gx * (1 - inertia)
            dy = dy * inertia - gy * (1 - inertia)
            ln = np.hypot(dx, dy)
            flat = ln < 1e-9
            if flat.any():
                ang = rng.random(int(flat.sum())) * 6.283185307
                dx[flat] = np.cos(ang)
                dy[flat] = np.sin(ang)
                ln[flat] = 1.0
            dx /= ln
            dy /= ln
            x = (x + dx) % n
            y = (y + dy) % n
            h1 = _bilinear(Hf, n, x, y)[0]
            dh = h1 - h0
            cap = np.maximum(-dh, min_slope) * speed * water * capacity
            up = (sed > cap) | (dh > 0)
            dep = np.where(dh > 0, np.minimum(dh, sed), (sed - cap) * deposition)
            ero = np.minimum((cap - sed) * erosion, -dh)
            dep = np.where(up, np.maximum(dep, 0.0), 0.0)
            ero = np.where(up, 0.0, np.maximum(ero, 0.0))
            sed = sed - dep + ero
            w = ((1 - fx) * (1 - fy), fx * (1 - fy), (1 - fx) * fy, fx * fy)
            for c in range(4):
                dep_i.append(idx[c]); dep_w.append(dep * w[c])
                ero_i.append(idx[c]); ero_w.append(ero * w[c])
            speed = np.sqrt(np.maximum(speed * speed - dh * gravity, 0.0))
            water = water * (1 - evaporation)
        # Mass conservation: whatever a droplet still carries is dropped where it stops.
        _, _, _, idx, fx, fy = _bilinear(Hf, n, x, y)
        w = ((1 - fx) * (1 - fy), fx * (1 - fy), (1 - fx) * fy, fx * fy)
        for c in range(4):
            dep_i.append(idx[c]); dep_w.append(sed * w[c])
        dep_map = np.bincount(np.concatenate(dep_i), np.concatenate(dep_w), minlength=n * n).reshape(n, n)
        ero_map = np.bincount(np.concatenate(ero_i), np.concatenate(ero_w), minlength=n * n).reshape(n, n)
        # Spread the removal over a small neighbourhood so channels are not 1 tile wide.
        for ax in (0, 1):
            ero_map = 0.25 * np.roll(ero_map, 1, ax) + 0.5 * ero_map + 0.25 * np.roll(ero_map, -1, ax)
        # Droplets in one batch do not see each other, so cap the change per cell
        # per batch. Without this they pile into the same pit or spike and run away.
        Hf += np.clip(dep_map - ero_map, -step_cap, step_cap).ravel()
    out = Hf.reshape(n, n)
    lo, hi = np.percentile(out, [0.05, 99.95])  # robust to a few stray spikes
    out = np.clip((out - lo) / (hi - lo), 0.0, 1.0)
    return out.astype(np.float32)


def hillshade(h, relief=150.0, azimuth=315.0, altitude=40.0):
    """Wrapping hillshade as a float array in [0, 1] (for the preview only)."""
    z = h.astype(np.float64) * relief
    gx = (np.roll(z, -1, 1) - np.roll(z, 1, 1)) * 0.5
    gy = (np.roll(z, -1, 0) - np.roll(z, 1, 0)) * 0.5
    az = np.radians(azimuth)
    al = np.radians(altitude)
    lx, ly, lz = np.sin(az) * np.cos(al), -np.cos(az) * np.cos(al), np.sin(al)
    nx, ny, nz = -gx, -gy, np.ones_like(z)
    inv = 1.0 / np.sqrt(nx * nx + ny * ny + nz * nz)
    return np.clip((nx * lx + ny * ly + nz * lz) * inv, 0.0, 1.0)


DEFAULT_FRACTIONS = "-1:0.06,0:0.35,1:0.16,2:0.13,3:0.11,4:0.08,5:0.06,6:0.05"
LEVEL_COLORS = np.array([
    (40, 70, 140),     # -1 water / pits
    (96, 150, 90),     #  0 base ground
    (140, 180, 90),    #  1
    (190, 200, 100),   #  2
    (215, 175, 90),    #  3
    (190, 130, 80),    #  4
    (150, 100, 80),    #  5
    (236, 236, 236),   #  6 highest
], dtype=np.uint8)


def quantize(h, fractions):
    """
    Cut a float heightmap into integer levels by percentile, so the share of
    tiles at each level is exactly what you asked for (no threshold guessing).
    `fractions` maps level -> share of the map, lowest height first.
    """
    items = sorted(fractions.items())
    total = sum(v for _, v in items)
    order = np.argsort(h, axis=None, kind="stable")
    levels = np.empty(h.size, dtype=np.int8)
    start = 0
    acc = 0.0
    for i, (lvl, share) in enumerate(items):
        acc += share / total
        end = h.size if i == len(items) - 1 else int(round(acc * h.size))
        levels[order[start:end]] = lvl
        start = end
    return levels.reshape(h.shape)


def parse_fractions(text):
    out = {}
    for part in text.split(","):
        k, v = part.split(":")
        out[int(k)] = float(v)
    return out


def write_png_rgb(path, img):
    """Write an HxWx3 uint8 array as an RGB PNG (stdlib only)."""
    h, w, _ = img.shape
    raw = b"".join(b"\x00" + img[y].tobytes() for y in range(h))

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 6))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def render_levels(levels, ramps=None):
    img = LEVEL_COLORS[(levels + 1).astype(np.int64)].copy()
    if ramps is not None:
        img[ramps > 0] = RAMP_COLOR
    return img


def render_crop(levels, cx, cy, size=96, zoom=8, view=(24, 14), ramps=None, mark=None):
    """Zoomed, wrapping crop with cliff lines and a rectangle the size of the game camera."""
    n = levels.shape[0]
    ys = (np.arange(cy - size // 2, cy + size // 2)) % n
    xs = (np.arange(cx - size // 2, cx + size // 2)) % n
    sub = levels[np.ix_(ys, xs)]
    sub_r = ramps[np.ix_(ys, xs)] if ramps is not None else None
    img = render_levels(sub, sub_r)
    img = np.repeat(np.repeat(img, zoom, 0), zoom, 1).copy()
    up = np.repeat(np.repeat(sub, zoom, 0), zoom, 1)
    edge = (up != np.roll(up, -1, 1)) | (up != np.roll(up, -1, 0))
    edge |= np.roll(edge, 1, 1) | np.roll(edge, 1, 0)
    if sub_r is not None:
        rm = np.repeat(np.repeat(sub_r > 0, zoom, 0), zoom, 1)
        for _ in range(2):   # open the cliff line where a ramp crosses it
            rm = rm | np.roll(rm, 1, 0) | np.roll(rm, -1, 0) | np.roll(rm, 1, 1) | np.roll(rm, -1, 1)
        edge &= ~rm
    img[edge] = (25, 25, 30)
    if mark is not None:
        mx, my = (mark[0] - (cx - size // 2)) % n, (mark[1] - (cy - size // 2)) % n
        if mx < size and my < size:
            mark_spawn(img, int(mx * zoom + zoom // 2), int(my * zoom + zoom // 2), arm=zoom * 2)
    vw, vh = view[0] * zoom, view[1] * zoom
    x0, y0 = (img.shape[1] - vw) // 2, (img.shape[0] - vh) // 2
    img[y0:y0 + vh, [x0, x0 + 1, x0 + vw - 2, x0 + vw - 1]] = (255, 40, 40)
    img[[y0, y0 + 1, y0 + vh - 2, y0 + vh - 1], x0:x0 + vw] = (255, 40, 40)
    return img


def _shift(a, dx, dy):
    return np.roll(np.roll(a, dy, 0), dx, 1)


def disc_offsets(width):
    """
    Cells of a disc exactly `width` tiles across, as (i, j) offsets from its
    top-left corner (so even widths like 8 are exact, not rounded down).
    """
    w = int(width)
    c = (w - 1) / 2.0
    r = w / 2.0
    return [(i, j) for j in range(w) for i in range(w)
            if (i - c) ** 2 + (j - c) ** 2 <= r * r + 1e-9]


def opening(mask, offs):
    """
    Morphological opening: keep only tiles that lie inside some copy of the disc
    that fits entirely within `mask` (wrapping). What is left is everywhere at
    least as wide as the disc.
    """
    er = np.ones_like(mask)
    for i, j in offs:
        er &= _shift(mask, -i, -j)      # er[p] = all of mask[p + offset]
    out = np.zeros_like(mask)
    for i, j in offs:
        out |= _shift(er, i, j)         # every tile covered by a fitting disc
    return out


def label_regions(lv):
    """
    Connected same-level regions on a wrapping grid (4-neighbour), numpy + a small
    union-find over horizontal runs. Returns (labels int32, count).
    """
    h, w = lv.shape
    start = np.ones((h, w), dtype=bool)
    start[:, 1:] = lv[:, 1:] != lv[:, :-1]
    run_id = (np.cumsum(start.ravel()) - 1).reshape(h, w)
    R = int(run_id.max()) + 1
    below = np.roll(run_id, -1, 0)
    same = lv == np.roll(lv, -1, 0)
    a = run_id[same].astype(np.int64)
    b = below[same].astype(np.int64)
    wrap = lv[:, 0] == lv[:, -1]
    a = np.concatenate([a, run_id[:, -1][wrap].astype(np.int64)])
    b = np.concatenate([b, run_id[:, 0][wrap].astype(np.int64)])
    keep = a != b
    key = np.unique(a[keep] * R + b[keep])
    parent = list(range(R))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for k in key.tolist():
        ra, rb = find(k // R), find(k % R)
        if ra != rb:
            parent[max(ra, rb)] = min(ra, rb)
    roots = np.array([find(i) for i in range(R)], dtype=np.int64)
    _, inv = np.unique(roots, return_inverse=True)
    return inv[run_id].astype(np.int32), int(inv.max()) + 1


def smooth_mode(lv, passes):
    """Majority filter (3x3, wrapping). Rounds off jagged contours."""
    lv = lv.copy()
    for _ in range(passes):
        cnt = np.zeros((8,) + lv.shape, dtype=np.int8)
        for l in range(-1, 7):
            m = lv == l
            c = np.zeros(lv.shape, dtype=np.int8)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    c += _shift(m, dx, dy)
            cnt[l + 1] = c
        best = cnt.argmax(0).astype(np.int8) - 1
        cur = cnt[(lv + 1).astype(np.int64), np.arange(lv.shape[0])[:, None], np.arange(lv.shape[1])[None, :]]
        lv = np.where(cnt.max(0) > cur, best, lv).astype(np.int8)
    return lv


def remove_thin(lv, offs, exempt=None, forbid_own=False):
    """
    Delete land bands narrower than the disc, then give each removed tile the level
    of the nearest surviving tile (closest in height wins). A band between two levels
    is split down the middle, so the cliff there jumps several levels at once.
    """
    thin = np.zeros(lv.shape, dtype=bool)
    for l in np.unique(lv):
        if l == exempt:
            continue
        m = lv == l
        thin |= m & ~opening(m, offs)
    if not thin.any():
        return lv
    out = lv.copy()
    orig = lv.astype(np.int16)
    assigned = ~thin
    # A removed tile must take a DIFFERENT level than it had, otherwise a thin
    # tongue next to its own wide body would simply grow back. Only if no other
    # level is reachable do we relax that and let it keep its own.
    relax = not forbid_own
    while not assigned.all():
        best_cost = np.full(lv.shape, 999, dtype=np.int16)
        best_lvl = out.copy()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            na = _shift(assigned, dx, dy)
            nl = _shift(out, dx, dy)
            nl16 = nl.astype(np.int16)
            cost = np.where(na, np.abs(nl16 - orig) * 4 + (nl16 + 1), 999)
            if forbid_own and not relax:
                cost = np.where(nl16 == orig, 999, cost)
            better = cost < best_cost
            best_cost = np.where(better, cost, best_cost)
            best_lvl = np.where(better, nl, best_lvl)
        grow = (~assigned) & (best_cost < 999)
        if not grow.any():
            if relax:
                break
            relax = True
            continue
        out = np.where(grow, best_lvl, out).astype(np.int8)
        assigned = assigned | grow
    return out


def merge_small(lv, min_area, exempt=-1, max_iter=20):
    """Give every same-level region under min_area the level it touches most."""
    lv = lv.copy()
    for _ in range(max_iter):
        labels, K = label_regions(lv)
        sizes = np.bincount(labels.ravel(), minlength=K)
        lab_lvl = np.zeros(K, dtype=np.int8)
        lab_lvl[labels.ravel()] = lv.ravel()
        small = (sizes < min_area) & (lab_lvl != exempt)
        if not small.any():
            break
        counts = np.zeros(K * 16, dtype=np.int64)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nl = _shift(labels, dx, dy)
            nv = _shift(lv, dx, dy)
            e = (labels != nl) & small[labels]
            counts += np.bincount(labels[e].astype(np.int64) * 16 + nv[e].astype(np.int64) + 1, minlength=K * 16)
        counts = counts.reshape(K, 16)
        sel = small & (counts.sum(1) > 0)
        if not sel.any():
            break
        newlvl = lab_lvl.copy()
        newlvl[sel] = (counts.argmax(1) - 1).astype(np.int8)[sel]
        lv = newlvl[labels]
    return lv


def thin_mask(lv, offs):
    """Tiles that do not lie inside any fitting disc of their own level."""
    t = np.zeros(lv.shape, dtype=bool)
    for l in range(-1, 7):
        m = lv == l
        if m.any():
            t |= m & ~opening(m, offs)
    return t


def fix_residual(lv, offs, max_iter=30):
    """
    Resolve leftover thin clusters (tips, junction slivers) one whole cluster at a
    time, each taking the other level it touches most. Whole-cluster moves do not
    ping-pong the way per-tile moves do. Keeps the best state seen.
    """
    best = lv
    best_n = int(thin_mask(lv, offs).sum())
    cur = lv
    for _ in range(max_iter):
        t = thin_mask(cur, offs)
        if not t.any():
            return cur
        tl = np.where(t, cur, 9).astype(np.int8)
        labels, K = label_regions(tl)
        lab_lvl = np.zeros(K, dtype=np.int8)
        lab_lvl[labels.ravel()] = tl.ravel()
        is_thin = lab_lvl != 9
        counts = np.zeros(K * 16, dtype=np.int64)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nl = _shift(labels, dx, dy)
            nv = _shift(cur, dx, dy)
            e = (labels != nl) & is_thin[labels] & (nv != cur)
            counts += np.bincount(labels[e].astype(np.int64) * 16 + nv[e].astype(np.int64) + 1, minlength=K * 16)
        counts = counts.reshape(K, 16)
        sel = is_thin & (counts.sum(1) > 0)
        if not sel.any():
            break
        newlvl = lab_lvl.copy()
        newlvl[sel] = (counts.argmax(1) - 1).astype(np.int8)[sel]
        nxt = np.where(is_thin[labels], newlvl[labels], cur).astype(np.int8)
        n = int(thin_mask(nxt, offs).sum())
        if n >= best_n:
            break
        best, best_n, cur = nxt, n, nxt
    return best


def cleanup(lv, smooth=2, min_width=8, min_area=400, passes=10):
    """Smooth contours, then alternate thin-band removal and small-region merging."""
    if smooth > 0:
        lv = smooth_mode(lv, smooth)
    offs = disc_offsets(min_width)
    for _ in range(passes):
        prev = lv
        if min_width > 1:
            lv = remove_thin(lv, offs)
        if min_area > 0:
            lv = merge_small(lv, min_area)
        if np.array_equal(lv, prev):
            break
    if min_width > 1:
        lv = fix_residual(lv, offs)
    if min_area > 0:
        lv = merge_small(lv, min_area)   # the cluster step can leave single-tile specks
    return lv


def describe(lv, min_width, min_area):
    """Text report on how usable a level map is."""
    land = int((lv != -1).sum())
    lines = ["  shares: " + "  ".join("%d:%.1f%%" % (l, 100.0 * (lv == l).mean()) for l in range(-1, 7))]
    offs = disc_offsets(min_width)
    thin = np.zeros(lv.shape, dtype=bool)
    for l in range(-1, 7):
        m = lv == l
        if m.any():
            thin |= m & ~opening(m, offs)
    labels, K = label_regions(lv)
    sizes = np.bincount(labels.ravel(), minlength=K)
    lab_lvl = np.zeros(K, dtype=np.int8)
    lab_lvl[labels.ravel()] = lv.ravel()
    small = (sizes < min_area) & (lab_lvl != -1)
    tl, tk = label_regions(np.where(thin, 1, 0).astype(np.int8))
    tsz = np.bincount(tl[thin].ravel(), minlength=tk)
    tsz = tsz[tsz > 0]
    d = np.concatenate([np.abs(lv.astype(np.int16) - np.roll(lv, -1, ax).astype(np.int16)).ravel() for ax in (0, 1)])
    d = d[d > 0]
    lines.append("  tiles in bands narrower than %d: %.2f%% of the map   regions: %d (%d land regions under %d tiles = %.1f%% of land)" % (
        min_width, 100.0 * thin.sum() / lv.size, K, int(small.sum()), min_area, 100.0 * sizes[small].sum() / land))
    if len(tsz):
        lines.append("  leftover narrow spots: %d clusters, median %d tiles, largest %d tiles" % (
            len(tsz), int(np.median(tsz)), int(tsz.max())))
    lines.append("  cliff heights: 1 level %.0f%%, 2 levels %.0f%%, 3+ levels %.0f%%" % (
        100.0 * (d == 1).mean(), 100.0 * (d == 2).mean(), 100.0 * (d >= 3).mean()))
    return "\n".join(lines)

# Ramp codes: direction from the ramp tile (on the UPPER level) down to the lower
# neighbour. A packed ramp value is  dir | ((drop - 1) << 3)  where drop is how many
# levels it descends (1 = a normal ramp, 2+ = a tall ramp over a tall cliff).
RAMP_DIRS = {1: (0, 1), 2: (0, -1), 3: (1, 0), 4: (-1, 0)}   # 1=E 2=W 3=S 4=N, as (dy, dx)
RAMP_COLOR = (255, 0, 200)


def drown_islands(lv, min_area=3000):
    """Land cut off from the main land mass by water becomes water if it is small."""
    land = lv >= 0
    lab, K = label_regions(np.where(land, 1, 0).astype(np.int8))
    sz = np.bincount(lab.ravel(), minlength=K)
    is_land = np.zeros(K, dtype=bool)
    is_land[lab[land]] = True
    main = int(np.argmax(np.where(is_land, sz, 0)))
    small = [k for k in np.flatnonzero(is_land) if k != main and sz[k] < min_area]
    big = [k for k in np.flatnonzero(is_land) if k != main and sz[k] >= min_area]
    out = lv.copy()
    if small:
        out[np.isin(lab, small)] = -1
    return out, len(small), len(big)


def find_runs(lv, labels, R, minlen, dirs="all"):
    """
    Straight stretches of cliff where a ramp could go: runs of tiles on the upper
    side whose neighbour in one direction is the SAME lower region. Returns
    (code, y, x, length, upper_label, lower_label); (y, x) is the run's first tile
    and it extends along +x for N/S ramps or +y for E/W ramps.
    """
    land = lv >= 0
    runs = []
    for code, (dy, dx) in RAMP_DIRS.items():
        if dirs == "ns" and dx != 0:
            continue
        nb = np.roll(lv, (-dy, -dx), (0, 1))
        nl = np.roll(labels, (-dy, -dx), (0, 1))
        c = land & (nb >= 0) & (nb < lv)
        key = np.where(c, labels.astype(np.int64) * R + nl, -1)
        if dx:
            key = key.T
        for r in range(key.shape[0]):
            row = key[r]
            if (row < 0).all():
                continue
            b = np.flatnonzero(np.r_[True, row[1:] != row[:-1], True])
            for st, en in zip(b[:-1].tolist(), b[1:].tolist()):
                k = int(row[st])
                if k >= 0 and en - st >= minlen:
                    up, lo = divmod(k, R)
                    y, x = (r, st) if not dx else (st, r)
                    runs.append((code, y, x, en - st, up, lo))
    return runs


def place_ramps(lv, seed, width=4, margin=1, spacing=60, loop_fraction=0.35, dirs="all"):
    """
    Connect every land region to every other through ramps.
      1. Regions are the nodes, neighbouring regions with a straight cliff run are
         the possible links. A minimum spanning tree guarantees connectivity, and
         single-level ramps are strongly preferred over tall ones.
      2. A share of the remaining single-level links get ramps too (loops), so
         routes are not all one long chain.
      3. Long cliffs get one ramp per `spacing` tiles of cliff.
    Level -1 (water or lava) is a wall. Returns (ramps uint8 array, report dict).
    """
    n = lv.shape[0]
    land = lv >= 0
    work = np.where(land, lv, 9).astype(np.int8)
    labels, R = label_regions(work)
    rl = np.zeros(R, dtype=np.int16)
    rl[labels.ravel()] = work.ravel()
    nodes = np.flatnonzero(rl != 9)
    runs = find_runs(lv, labels, R, 2, "all")
    pairs = {}
    for r in runs:
        pairs.setdefault((min(r[4], r[5]), max(r[4], r[5])), []).append(r)
    need = width + 2 * margin
    # "ns" is a preference, not a ban: a pair that only touches along east or west
    # cliffs still gets an east/west ramp, because connectivity comes first.
    fallback = set()
    if dirs == "ns":
        for key, rs in list(pairs.items()):
            f = [r for r in rs if r[0] in (3, 4)]
            if f:
                pairs[key] = f
            else:
                fallback.add(key)

    edges = []
    for key, rs in pairs.items():
        total = sum(r[3] for r in rs)
        longest = max(r[3] for r in rs)
        drop = int(rl[rs[0][4]] - rl[rs[0][5]])
        cost = (20.0 * (drop - 1) + (0.0 if longest >= need else 5.0) + (30.0 if key in fallback else 0.0)
                + 1.0 / (1 + total))
        edges.append((cost, key, drop, total))
    edges.sort()

    parent = list(range(R))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    tree, rest = [], []
    for e in edges:
        ra, rb = find(e[1][0]), find(e[1][1])
        if ra != rb:
            parent[ra] = rb
            tree.append(e)
        else:
            rest.append(e)
    components = len({find(int(i)) for i in nodes})

    rng = np.random.default_rng(seed + 424242)
    loops = [e for e in rest if e[2] == 1 and e[1] not in fallback
             and max(r[3] for r in pairs[e[1]]) >= need and rng.random() < loop_fraction]

    ramps = np.zeros((n, n), dtype=np.uint8)
    stats = {"sites": 0, "dirs": {1: 0, 2: 0, 3: 0, 4: 0}, "drops": {}, "narrow": 0, "forced": 0}

    def tiles_of(code, y, x, o, w):
        dy, dx = RAMP_DIRS[code]
        return [((y + (o + i if dx else 0)) % n, (x + (o + i if not dx else 0)) % n) for i in range(w)]

    def blocked(tiles):
        for ty, tx in tiles:
            win = ramps[np.ix_(np.arange(ty - 2, ty + 3) % n, np.arange(tx - 2, tx + 3) % n)]
            if win.any():
                return True
        return False

    def place(code, tiles, drop):
        for ty, tx in tiles:
            ramps[ty, tx] = code | ((drop - 1) << 3)
        stats["sites"] += 1
        stats["dirs"][code] += 1
        stats["drops"][drop] = stats["drops"].get(drop, 0) + 1

    def sites_for(e, force):
        _, key, drop, total = e
        rs = sorted(pairs[key], key=lambda r: -r[3])
        want = max(1, total // spacing)
        got = 0
        for code, y, x, L, up, lo in rs:
            if got >= want:
                break
            full = L >= need
            w_eff = width if full else L
            lo_off = margin if full else 0
            hi_off = L - w_eff - lo_off
            k = max(1, L // spacing)
            for j in range(k):
                if got >= want:
                    break
                o = (lo_off + hi_off) // 2 if k == 1 else int(round(lo_off + (hi_off - lo_off) * (j + 0.5) / k))
                tiles = tiles_of(code, y, x, o, w_eff)
                if not force and blocked(tiles):
                    continue
                place(code, tiles, drop)
                if not full:
                    stats["narrow"] += 1
                if force:
                    stats["forced"] += 1
                got += 1
        return got

    for e in tree + loops:
        if sites_for(e, False) == 0 and e in tree:
            sites_for(e, True)

    report = {
        "regions": len(nodes), "pairs": len(pairs), "components_after_tree": components,
        "tree": len(tree), "loops": len(loops), "stats": stats,
        "ew_fallback": sum(1 for e in tree + loops if e[1] in fallback),
    }
    return ramps, report


def verify_walk(lv, ramps):
    """
    Independent check: flood fill from one land tile, tile by tile, moving between
    4-neighbours of the SAME level and across ramps only. Also checks that every
    ramp really points at a lower land tile and records the right drop.
    """
    n = lv.shape[0]
    flat = lv.ravel()
    idx = np.arange(n * n).reshape(n, n)
    nb = [np.roll(idx, s, a).ravel().tolist() for a, s in ((1, -1), (1, 1), (0, -1), (0, 1))]
    link = {}
    bad = 0
    ys, xs = np.nonzero(ramps)
    for y, x in zip(ys.tolist(), xs.tolist()):
        v = int(ramps[y, x])
        dy, dx = RAMP_DIRS[v & 7]
        a = y * n + x
        b = ((y + dy) % n) * n + (x + dx) % n
        if flat[a] < 0 or flat[b] < 0 or flat[b] >= flat[a] or int(flat[a] - flat[b]) != (v >> 3) + 1:
            bad += 1
        link.setdefault(a, []).append(b)
        link.setdefault(b, []).append(a)
    fl = flat.tolist()
    land_total = int((flat >= 0).sum())
    start = int(np.flatnonzero(flat >= 0)[0])
    seen = bytearray(n * n)
    seen[start] = 1
    stack = [start]
    count = 1
    while stack:
        i = stack.pop()
        li = fl[i]
        for arr in nb:
            j = arr[i]
            if not seen[j] and fl[j] == li:
                seen[j] = 1
                count += 1
                stack.append(j)
        for j in link.get(i, ()):
            if not seen[j]:
                seen[j] = 1
                count += 1
                stack.append(j)
    return count, land_total, bad


def pick_spawn(lv):
    """
    Spawn rule: the largest region of the lowest non-water level. Inside it, the
    tile with the most open ground around it (centre of the biggest disc that fits),
    so the start is not hugging a cliff or a shore. Returns a dict.
    """
    low = int(lv[lv >= 0].min())
    mask = lv == low
    lab, K = label_regions(np.where(mask, 1, 0).astype(np.int8))
    sizes = np.bincount(lab[mask].ravel(), minlength=K)
    best = int(np.argmax(sizes))
    region = lab == best
    cur = region.copy()
    last = cur
    d = 0
    while cur.any():
        last = cur
        d += 1
        e = cur & np.roll(cur, 1, 0) & np.roll(cur, -1, 0) & np.roll(cur, 1, 1) & np.roll(cur, -1, 1)
        if d % 2 == 0:   # alternate with the diagonals so the shape is a disc, not a diamond
            e &= (np.roll(np.roll(cur, 1, 0), 1, 1) & np.roll(np.roll(cur, 1, 0), -1, 1)
                  & np.roll(np.roll(cur, -1, 0), 1, 1) & np.roll(np.roll(cur, -1, 0), -1, 1))
        cur = e
    tiles = np.flatnonzero(last.ravel())
    t = int(tiles[len(tiles) // 2])
    n = lv.shape[0]
    return {"x": t % n, "y": t // n, "level": low, "region_tiles": int(sizes[best]),
            "level_tiles": int(mask.sum()), "clearance": d}


def spawn_check(lv, sp):
    """Independent check: every tile within 90% of the claimed clearance is level `low`."""
    n = lv.shape[0]
    r = int(sp["clearance"] * 0.9)
    ys, xs = np.mgrid[-r:r + 1, -r:r + 1]
    inside = ys * ys + xs * xs <= r * r
    win = lv[np.ix_((sp["y"] + np.arange(-r, r + 1)) % n, (sp["x"] + np.arange(-r, r + 1)) % n)]
    return r, bool((win[inside] == sp["level"]).all())


def mark_spawn(img, x, y, arm=6, color=(255, 230, 0)):
    h, w, _ = img.shape
    for k in range(-arm, arm + 1):
        for t in (-1, 0, 1):
            img[(y + t) % h, (x + k) % w] = color
            img[(y + k) % h, (x + t) % w] = color



def seam_report(h):
    """Compare the wrap-around step to ordinary neighbour steps."""
    inner_x = np.abs(np.diff(h, axis=1)).mean()
    inner_y = np.abs(np.diff(h, axis=0)).mean()
    wrap_x = np.abs(h[:, 0] - h[:, -1]).mean()
    wrap_y = np.abs(h[0, :] - h[-1, :]).mean()
    return wrap_x / inner_x, wrap_y / inner_y


def write_png_gray(path, img):
    """Write a 2D uint8 array as an 8-bit grayscale PNG (stdlib only)."""
    h, w = img.shape
    raw = b"".join(b"\x00" + img[y].tobytes() for y in range(h))

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 0, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 6))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def main():
    ap = argparse.ArgumentParser(description="Tileable base heightmap generator")
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--size", type=int, default=1024, help="grid is size x size tiles")
    ap.add_argument("--beta", type=float, default=3.2)
    ap.add_argument("--min-feature", type=float, default=40.0, dest="min_feature")
    ap.add_argument("--max-feature", type=float, default=500.0, dest="max_feature",
                    help="remove wavelengths longer than this many tiles (0 = off)")
    ap.add_argument("--ridged", action="store_true",
                    help="fold the field so mid-height contours become sharp ridge crests")
    ap.add_argument("--lifetime", type=int, default=40, help="steps per erosion droplet")
    ap.add_argument("--erode", type=int, default=0, metavar="DROPS",
                    help="number of erosion droplets (try ~1.5 per tile, e.g. 1500000 for 1024)")
    ap.add_argument("--relief", type=float, default=150.0,
                    help="height range in tile units used by erosion and hillshade")
    ap.add_argument("--quantize", action="store_true",
                    help="also cut the heightmap into integer levels and render colour previews")
    ap.add_argument("--levels", default=DEFAULT_FRACTIONS,
                    help="level:share pairs, lowest height first (default %s)" % DEFAULT_FRACTIONS)
    ap.add_argument("--smooth", type=int, default=2, help="majority-filter passes before cleanup")
    ap.add_argument("--min-width", type=int, default=8, dest="min_width",
                    help="every level, water included, must be at least this many tiles across (1 = off)")
    ap.add_argument("--min-area", type=int, default=400, dest="min_area",
                    help="merge same-level regions smaller than this many tiles (0 = off)")
    ap.add_argument("--passes", type=int, default=10, help="max cleanup passes")
    ap.add_argument("--no-ramps", action="store_true", dest="no_ramps", help="skip the ramp and connectivity pass")
    ap.add_argument("--ramp-width", type=int, default=4, dest="ramp_width", help="ramp width in tiles")
    ap.add_argument("--ramp-spacing", type=int, default=60, dest="ramp_spacing",
                    help="about one ramp per this many tiles of cliff between two plateaus")
    ap.add_argument("--loop-fraction", type=float, default=0.35, dest="loop_fraction",
                    help="share of extra single-level links that also get a ramp (0 = bare minimum, a tree)")
    ap.add_argument("--ramp-dirs", choices=["all", "ns"], default="all", dest="ramp_dirs",
                    help="'ns' = ramps only on cliffs that face north or south")
    ap.add_argument("--island-area", type=int, default=3000, dest="island_area",
                    help="land cut off by water and smaller than this becomes water")
    ap.add_argument("--crop", type=int, nargs=2, default=None, metavar=("X", "Y"),
                    help="tile coordinates of the centre of the zoomed crop (default: map centre)")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "out"))
    ap.add_argument("--preview-tiles", type=int, default=1, dest="preview_tiles",
                    help="repeat the preview NxN to check the wrap visually")
    ap.add_argument("--preview-max", type=int, default=1024, dest="preview_max",
                    help="downsample the preview so its side is at most this many px")
    args = ap.parse_args()

    if args.size < 16 or args.size & (args.size - 1):
        print("note: --size is best as a power of two (FFT speed); got %d" % args.size, file=sys.stderr)

    h = make_heightmap(args.size, args.seed, args.beta, args.min_feature, args.max_feature)
    if args.ridged:
        z = h - h.mean()
        h = -np.abs(z)
        h = ((h - h.min()) / (h.max() - h.min())).astype(np.float32)
    if args.erode > 0:
        h = erode(h, args.erode, args.seed, relief=args.relief, lifetime=args.lifetime)

    os.makedirs(args.out, exist_ok=True)
    stem = "heightmap_%d_%d" % (args.seed, args.size)
    npy_path = os.path.join(args.out, stem + ".npy")
    png_path = os.path.join(args.out, stem + ".png")
    np.save(npy_path, h)

    prev = np.tile(h, (args.preview_tiles, args.preview_tiles))
    step = max(1, int(np.ceil(prev.shape[0] / args.preview_max)))
    prev = prev[::step, ::step]
    write_png_gray(png_path, np.clip(prev * 255.0 + 0.5, 0, 255).astype(np.uint8))

    shade = np.tile(hillshade(h, args.relief), (args.preview_tiles, args.preview_tiles))[::step, ::step]
    write_png_gray(os.path.join(args.out, stem + "_shade.png"), np.clip(shade * 255.0 + 0.5, 0, 255).astype(np.uint8))

    if args.quantize:
        fr = parse_fractions(args.levels)
        raw = quantize(h, fr)
        lv = cleanup(raw, args.smooth, args.min_width, args.min_area, args.passes)
        ramps = None
        if not args.no_ramps:
            lv, drowned, big_islands = drown_islands(lv, args.island_area)
            ramps, rep = place_ramps(lv, args.seed, args.ramp_width, 1, args.ramp_spacing,
                                     args.loop_fraction, args.ramp_dirs)
            reached, land_total, bad = verify_walk(lv, ramps)
            np.save(os.path.join(args.out, "ramps_%d_%d.npy" % (args.seed, args.size)), ramps)
        np.save(os.path.join(args.out, "levels_%d_%d.npy" % (args.seed, args.size)), lv)
        spawn = pick_spawn(lv)
        with open(os.path.join(args.out, "spawn_%d_%d.json" % (args.seed, args.size)), "w") as f:
            json.dump(spawn, f, indent=2)
        step2 = max(1, int(np.ceil(lv.shape[0] / args.preview_max)))
        full = render_levels(lv, ramps)
        mark_spawn(full, spawn["x"], spawn["y"])
        write_png_rgb(os.path.join(args.out, stem + "_levels.png"), full[::step2, ::step2])
        cx, cy = args.crop if args.crop else (spawn["x"], spawn["y"])
        write_png_rgb(os.path.join(args.out, stem + "_crop.png"), render_crop(lv, cx, cy, ramps=ramps, mark=(spawn["x"], spawn["y"])))
        write_png_rgb(os.path.join(args.out, stem + "_crop_raw.png"), render_crop(raw, cx, cy))
        sr, sok = spawn_check(lv, spawn)
        print("spawn: tile (%d, %d) at level %d, inside the largest level-%d region (%d tiles, %.0f%% of that level); open ground radius about %d tiles; check (all tiles within %d are level %d): %s"
              % (spawn["x"], spawn["y"], spawn["level"], spawn["level"], spawn["region_tiles"],
                 100.0 * spawn["region_tiles"] / spawn["level_tiles"], spawn["clearance"], sr, spawn["level"],
                 "pass" if sok else "FAIL"))
        print("raw quantized:")
        print(describe(raw, args.min_width, args.min_area))
        print("after cleanup:")
        print(describe(lv, args.min_width, args.min_area))
        if ramps is not None:
            st = rep["stats"]
            print("ramps:")
            print("  islands drowned: %d (%d larger ones left: %s)" % (drowned, big_islands, "bridging not implemented" if big_islands else "none"))
            print("  %d land regions, %d neighbouring pairs; spanning tree %d links + %d loop links; components after tree: %d"
                  % (rep["regions"], rep["pairs"], rep["tree"], rep["loops"], rep["components_after_tree"]))
            print("  %d ramps placed (E %d, W %d, S %d, N %d); drops: %s; narrow ramps: %d, forced: %d"
                  % (st["sites"], st["dirs"][1], st["dirs"][2], st["dirs"][3], st["dirs"][4],
                     ", ".join("%d level%s: %d" % (d, "" if d == 1 else "s", c) for d, c in sorted(st["drops"].items())),
                     st["narrow"], st["forced"]))
            if args.ramp_dirs == "ns":
                print("  east/west ramps used only where a pair has no north/south cliff: %d" % rep["ew_fallback"])
            print("  tile-by-tile flood fill reaches %d of %d land tiles (%.3f%%); invalid ramps: %d"
                  % (reached, land_total, 100.0 * reached / land_total, bad))
            if reached != land_total or bad:
                print("  WARNING: %d land tiles are NOT reachable and %d ramps are invalid, do not use this map"
                      % (land_total - reached, bad))

    sx, sy = seam_report(h)
    pct = np.percentile(h, [5, 25, 50, 75, 95])
    print("seed=%d size=%d beta=%.2f min_feature=%.1f" % (args.seed, args.size, args.beta, args.min_feature))
    print("mean=%.3f std=%.3f  percentiles 5/25/50/75/95: %s" % (h.mean(), h.std(), " ".join("%.3f" % p for p in pct)))
    print("seam ratio (wrap step / normal step, ~1.0 means seamless): x=%.2f y=%.2f" % (sx, sy))
    print("wrote", npy_path, "(%.1f MB)" % (os.path.getsize(npy_path) / 1e6))
    print("wrote", png_path, "and the _shade.png hillshade next to it")


if __name__ == "__main__":
    main()
