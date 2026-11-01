#!/usr/bin/env python3
"""
build_move_conversions.py  (docs/move_rework_holding/)

Generates move-conversions.json for the move-compare.html review tool.
For each of the 64 in-game moves (js/data/moves.js) it emits:
  { id, name, current{...}, raw{...source facts...}, proposed{...schema seed...}, confidence, seedNotes[] }

"proposed" is a CLEAN KIND-SEED: a best-effort auto-map from the current
in-game `kind` + fields onto the finalized SPACE/DELIVERY/PAYLOAD axis schema
(docs/MOVE-AXIS-SCHEMA.md). It is a first draft to be corrected in the tool,
NOT a decision. Low-confidence seeds are flagged so the reviewer knows which
ones the mapper is guessing at.

Template rules locked with Jess (2026-10-24):
  - top-level = verbatim source lifts only (type,category,power,pp,accuracy,priority,flavor_text)
  - ailment lives in payload ONLY (not top level)
  - enemy contact owned by pierce; endOn carries only time/wall/offScreen
  - omit cd (resolver derives from pp), omit splash when off, omit defaults
No game code is touched. This script only reads moves.js + api_move_dataset.json
and writes a JSON doc artifact.
"""
import re, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
MOVES_JS = os.path.join(REPO, "js", "data", "moves.js")
RAW_JSON = os.path.join(HERE, "api_move_dataset.json")
OUT = os.path.join(HERE, "move-conversions.json")

# ---- 1. parse the 64 current moves out of moves.js (JS object literals) ----
def strip_comments(src):
    """Remove // line comments and /* */ block comments, preserving string
    literals (', ", `). moves.js has backticks and braces INSIDE comments
    (the header block + the giga-drain notes), which otherwise corrupt the
    brace/string walk below."""
    out = []; i = 0; n = len(src); instr = None; esc = False
    while i < n:
        c = src[i]
        if instr:
            out.append(c)
            if esc: esc = False
            elif c == "\\": esc = True
            elif c == instr: instr = None
            i += 1; continue
        if c in "'\"`":
            instr = c; out.append(c); i += 1; continue
        if c == "/" and i+1 < n and src[i+1] == "/":
            i += 2
            while i < n and src[i] != "\n": i += 1
            continue
        if c == "/" and i+1 < n and src[i+1] == "*":
            i += 2
            while i+1 < n and not (src[i] == "*" and src[i+1] == "/"): i += 1
            i += 2; continue
        out.append(c); i += 1
    return "".join(out)

def parse_current(src):
    src = strip_comments(src)
    start = src.index("const RAW"); a = src.index("[", start)
    depth = 0
    for i in range(a, len(src)):
        c = src[i]
        if c == "[": depth += 1
        elif c == "]":
            depth -= 1
            if depth == 0: b = i; break
    body = src[a+1:b]
    objs = []; depth = 0; cur = ""; instr = None; esc = False
    for ch in body:
        if instr:
            cur += ch
            if esc: esc = False
            elif ch == "\\": esc = True
            elif ch == instr: instr = None
            continue
        if ch in "'\"`": instr = ch; cur += ch; continue
        if ch == "{": depth += 1; cur += ch
        elif ch == "}":
            depth -= 1; cur += ch
            if depth == 0: objs.append(cur.strip()); cur = ""
        else:
            if depth > 0: cur += ch
    return objs

def js_obj_to_py(o):
    """Very small JS-object -> python dict parser for these flat move literals."""
    d = {}
    # strip outer braces
    s = o.strip()[1:-1]
    # tokenize key: value pairs at top level (value may be {..} or [..] or 'str' or num/bool)
    i = 0; n = len(s)
    def skip_ws(i):
        while i < n and s[i] in " \n\t\r,": i += 1
        return i
    while True:
        i = skip_ws(i)
        if i >= n: break
        m = re.match(r"([a-zA-Z_]\w*)\s*:", s[i:])
        if not m: break
        key = m.group(1); i += m.end()
        i = skip_ws(i)
        if i >= n: break
        ch = s[i]
        if ch in "'\"`":
            q = ch; j = i+1; buf = ""; esc = False
            while j < n:
                cj = s[j]
                if esc: buf += cj; esc = False
                elif cj == "\\": esc = True
                elif cj == q: break
                else: buf += cj
                j += 1
            d[key] = buf; i = j+1
        elif ch == "{":
            depth = 0; j = i
            while j < n:
                if s[j] == "{": depth += 1
                elif s[j] == "}":
                    depth -= 1
                    if depth == 0: break
                j += 1
            inner = s[i:j+1]; d[key] = js_obj_to_py(inner); i = j+1
        elif ch == "[":
            depth = 0; j = i
            while j < n:
                if s[j] == "[": depth += 1
                elif s[j] == "]":
                    depth -= 1
                    if depth == 0: break
                j += 1
            arr = s[i:j+1]
            items = re.findall(r"'([^']*)'", arr)
            d[key] = items; i = j+1
        else:
            j = i
            while j < n and s[j] not in ",}\n": j += 1
            tok = s[i:j].strip()
            if tok in ("true","false"): d[key] = (tok == "true")
            else:
                try: d[key] = int(tok)
                except:
                    try: d[key] = float(tok)
                    except: d[key] = tok
            i = j
    return d

# ---- 2. seed mapping: current kind + fields -> schema axes ----
def seed_proposed(cur, raw):
    kind = cur.get("kind")
    conf = "high"; notes = []
    space = {}; delivery = {}; payload = [{"t": "damage"}]

    def add_ailment():
        a = cur.get("ailment")
        if a and a != "none":
            ch = cur.get("ailmentChance", 0) or 0
            # status moves with chance 0 in-source often mean "guaranteed" in our model
            if ch == 0 and cur.get("cat") == "status": ch = 100
            payload.append({"t": "ailment", "id": a, "chance": ch, "side": "foe"})

    def add_stat():
        st = cur.get("stage") or cur.get("self")
        if isinstance(st, dict) and st.get("stat"):
            scope = "team" if cur.get("self") else "foe"
            payload.append({"t": "stat", "stat": st["stat"], "stages": st.get("n", -1),
                            "side": scope, "scope": "team" if scope=="team" else "individual"})
        if cur.get("statChance"):
            notes.append("statChance %s present; confirm stat payload chance" % cur.get("statChance"))

    def kb():
        if cur.get("knock"): payload.append({"t": "knockback", "distance": cur["knock"]})

    if kind == "projectile":
        space = {"shape":"radial","radRadius":cur.get("size",6),"count":cur.get("count",1),"pierce":cur.get("pierce",0)}
        if cur.get("spread"): space["spread"] = cur["spread"]
        delivery = {"anchor":"caster","targeting":"nearest" if cur.get("homing") else "direction",
                    "motion":"travels","moveSpeed":cur.get("speed",300),
                    "endOn":[{"time":cur.get("life",1.6)},{"contact":"wall"},{"offScreen":True}]}
        if cur.get("homing"): delivery["turnRate"] = cur["homing"]
    elif kind == "beam":
        space = {"shape":"linear","linLength":cur.get("radius",260),"linWidth":cur.get("width",34),
                 "pierce":"UNLIMITED"}
        delivery = {"anchor":"caster","targeting":"nearest","motion":"static",
                    "endOn":[{"time":cur.get("life",0.5)}]}
        notes.append("beam is a directional instance that passes through all enemies: pierce=UNLIMITED (named constant, resolver maps it; never 999/0).")
    elif kind == "melee":
        # a melee arc is a STATIC area: it hits every enemy it overlaps via geometry + hitPolicy:oncePerInstance.
        # pierce is for DIRECTIONAL instances only, so a melee arc carries no pierce field at all.
        space = {"shape":"radial","radArc":cur.get("arc",1.7),"radRadius":cur.get("radius",48),"count":1}
        delivery = {"anchor":"caster","targeting":"nearest","motion":"static","endOn":[{"time":0.15}]}
        notes.append("melee arc = static area; hits all overlapping enemies once (hitPolicy:oncePerInstance). No pierce (directional-only field).")
    elif kind == "nova":
        space = {"shape":"radial","radArc":6.2832,"radRadius":cur.get("radius",cur.get("size",200))}
        delivery = {"anchor":"caster","targeting":"none","motion":"travels" if cur.get("speed") else "static",
                    "endOn":[{"time":cur.get("life",1.1)}]}
        if cur.get("speed"): delivery["moveSpeed"] = cur["speed"]
        if cur.get("count"): notes.append("nova current uses count=%s pellets; schema nova is one expanding ring (grow). CONVERSION CHANGES BEHAVIOR." % cur["count"]); conf="low"
        notes.append("nova = static expanding ring; hitPolicy:oncePerInstance as the edge crosses each enemy. No pierce.")
    elif kind == "aura":
        space = {"shape":"radial","radArc":6.2832,"radRadius":cur.get("radius",72)}
        delivery = {"anchor":"caster","targeting":"none","motion":"static","endOn":[{"notActive":True}]}
        notes.append("aura = persistent static circle; needs rehit interval + hitPolicy:interval. No pierce (static)."); conf="low"
    elif kind == "buff":
        space = {}; delivery = {"anchor":"self","targeting":"self"}
        payload = []
        st = cur.get("stat"); 
        if st: payload.append({"t":"stat","stat":st,"stages":cur.get("stageN",cur.get("stage2",1)),"side":"self","scope":"team","duration":cur.get("dur")})
        notes.append("self-buff; no hitbox"); 
    elif kind == "orbit":
        space = {"shape":"radial","radRadius":cur.get("size",8),"count":cur.get("count",3)}
        delivery = {"anchor":"caster","targeting":"none","motion":"orbits","orbitRadius":cur.get("radius",62),
                    "angularSpeed":cur.get("speed",2.5),"endOn":[{"notActive":True}]}
        conf="low"; notes.append("orbit orbs are persistent; use rehit + hitPolicy:interval, not pierce. angularSpeed reused from current 'speed' (rad/s), confirm.")
    elif kind == "boomerang":
        space = {"shape":"radial","radRadius":cur.get("size",6),"count":cur.get("count",1),"pierce":cur.get("pierce",0)}
        if cur.get("spread"): space["spread"]=cur["spread"]
        delivery = {"anchor":"caster","targeting":"direction","motion":"returns","moveSpeed":cur.get("speed",300),
                    "endOn":[{"time":2.0}]}
        notes.append("boomerang is directional (out-and-back): pierce default 0 (confirm how many it cuts through). motion:returns; confirm max range %s." % cur.get("radius"))
    elif kind == "chain":
        space = {"shape":"radial","radRadius":cur.get("size",8),"count":1,"pierce":0,
                 "chainHops":cur.get("count",3),"hopRange":cur.get("radius",140)}
        delivery = {"anchor":"caster","targeting":"nearest","motion":"travels","moveSpeed":cur.get("speed",400),
                    "endOn":[{"time":0.3}]}
        conf="low"; notes.append("chain: count reused as chainHops; confirm hop range")
    elif kind == "mine":
        space = {"shape":"radial","radRadius":cur.get("radius",60),"count":cur.get("count",2)}
        delivery = {"anchor":"world","targeting":"location","motion":"static",
                    "endOn":[{"time":cur.get("dur",8)},{"contact":"wall"}]}
        conf="low"; notes.append("mine: detonation is a trigger:contact emitter, not pierce; schema says mine uses trigger+timeout")
    elif kind == "meteor":
        space = {"shape":"radial","radArc":6.2832,"radRadius":cur.get("radius",54),"count":cur.get("count",2)}
        delivery = {"anchor":"world","targeting":"nearest","motion":"falls","endOn":[{"time":0.1}]}
        payload.insert(0,{"t":"damage"}); 
        notes.append("meteor: each impact is a static radial burst (no pierce); falls + delay wind-up (telegraph shadow); set caster delay."); conf="low"
    elif kind == "turret":
        space = {}; delivery = {"anchor":"world","targeting":"location","motion":"static",
                 "endOn":[{"time":cur.get("dur",6)},{"ownerDeath":True}]}
        payload = [{"t":"emit","every":cur.get("rate",0.4),"trigger":"interval"}]
        conf="low"; notes.append("turret = emit primitive (emitter has no HP); substitute is actually a shield self-cast, re-check")
    elif kind == "dash":
        # dash defaults to a SINGLE-TARGET lunge (pierce 0): most dashes are a fast jab to one enemy.
        # A rare line-clearing dash (sweeps through a crowd) gets bumped up by hand in the tool.
        space = {"shape":"linear","linLength":cur.get("radius",110),"linWidth":cur.get("width",34),"pierce":cur.get("pierce",0)}
        delivery = {"anchor":"caster","targeting":"direction","motion":"repositions","repositionMode":"swept",
                    "endOn":[{"time":0.2}]}
        notes.append("dash default = pierce 0 (single-target lunge). Bump pierce up (or UNLIMITED) only for a deliberate line-clearing dash. motion:repositions + iframes (caster-state); swept vs teleport?")
        conf="low"
        # Quick Attack: canonical sweptReturn worked example (Jess, 2026-10-24).
        # Fast lunge to nearest enemy and back at 10x move speed; speed-driven, ends on {returned}, not a timer.
        if cur["id"]=="quick-attack":
            delivery = {"anchor":"caster","targeting":"nearest","motion":"repositions",
                        "repositionMode":"swept","dashMult":10,"returnToOrigin":True,"returnHits":"outAndBack",
                        "endOn":[{"returned":True}]}
            notes.append("Return-dash worked example: repositionMode swept + returnToOrigin true + dashMult 10 (10x final move speed) out to nearest enemy and back to the launch point, striking on both legs; ends on {returned} (speed-driven, no fixed time).")
    elif kind == "trail":
        space = {"shape":"radial","radRadius":cur.get("radius",26)}
        delivery = {"anchor":"caster","targeting":"self","motion":"static"}
        payload = [{"t":"emit","every":0.2,"trigger":"interval"}]
        conf="low"; notes.append("trail = emitter that drops puddles as caster moves")
    elif kind == "cone":
        space = {"shape":"radial","radArc":cur.get("arc",0.9),"radRadius":cur.get("speed",380)*cur.get("life",0.42),
                 "count":cur.get("count",7),"pierce":cur.get("pierce",1)}
        delivery = {"anchor":"caster","targeting":"nearest","motion":"static","aimTrack":1.4,
                    "endOn":[{"time":cur.get("life",0.42)}]}
        conf="low"; notes.append("cone: schema models as aimTrack cone (NOT count pellets). Flamethrower-class feel-call.")
    else:
        conf="low"; notes.append("UNMAPPED kind '%s'" % kind)
        delivery = {"anchor":"caster","targeting":"nearest","motion":"static"}

    # riders common to damaging kinds
    if kind not in ("buff","turret","trail"):
        add_ailment(); add_stat(); kb()

    # hitPolicy (top-level, three values: oncePerInstance default / interval(+rehit) / onReentry).
    # Persistent damage areas that re-tick the SAME enemy over time use interval + a rehit interval;
    # single-contact shapes use the default oncePerInstance; shapeless casts have no hitbox so none.
    hitPolicy = None; rehit = None
    TICK_KINDS = ("aura","orbit","trail")     # persistent: re-damage the same enemy on an interval
    NO_HITBOX = ("buff",)                      # shapeless self-cast
    if kind in TICK_KINDS:
        hitPolicy = "interval"; rehit = cur.get("rate", 0.4)
        notes.append("persistent area: hitPolicy=interval, rehit=%s s (seeded; confirm tick cadence)." % rehit)
    # oncePerInstance is the DEFAULT: omit it (same rule as omitting cd/splash/hitCap defaults).
    # Only write hitPolicy when it differs from the default (interval / onReentry).

    prop = {"id":cur["id"],"name":cur["name"],
            "type":raw.get("type",cur.get("type")),
            "category":raw.get("damage_class",cur.get("cat")),
            "power":raw.get("source",{}).get("power") if isinstance(raw.get("source"),dict) else cur.get("dmg"),
            "pp":raw.get("source",{}).get("pp") if isinstance(raw.get("source"),dict) else None,
            "accuracy":raw.get("source",{}).get("accuracy") if isinstance(raw.get("source"),dict) else None,
            "priority":raw.get("source",{}).get("priority") if isinstance(raw.get("source"),dict) else None,
            "flavor_text":(raw.get("flavor_text") or {}).get("flavor_text") if isinstance(raw.get("flavor_text"),dict) else None}
    if hitPolicy: prop["hitPolicy"] = hitPolicy
    if rehit is not None: prop["rehit"] = rehit
    if space: prop["space"]=space
    prop["delivery"]=delivery
    prop["payload"]=payload
    return prop, conf, notes

def main():
    with open(MOVES_JS, encoding="utf-8") as f: src = f.read()
    with open(RAW_JSON, encoding="utf-8") as f: raw = json.load(f)
    raw_by_id = {m["source"]["identifier"]: m for m in raw["moves"]}

    objs = parse_current(src)
    records = []
    for o in objs:
        cur = js_obj_to_py(o)
        rid = cur.get("id")
        r = raw_by_id.get(rid, {})
        proposed, conf, notes = seed_proposed(cur, r)
        raw_facts = {}
        if r:
            s = r.get("source",{})
            raw_facts = {"type":r.get("type"),"category":r.get("damage_class"),
                         "power":s.get("power"),"pp":s.get("pp"),"accuracy":s.get("accuracy"),
                         "priority":s.get("priority"),"target":r.get("target"),
                         "meta_category":(r.get("meta") or {}).get("category"),
                         "ailment":(r.get("meta") or {}).get("ailment"),
                         "ailment_chance":(r.get("meta") or {}).get("ailment_chance"),
                         "flavor_text":(r.get("flavor_text") or {}).get("flavor_text")}
        records.append({"id":rid,"name":cur.get("name"),"kind":cur.get("kind"),
                        "current":cur,"raw":raw_facts,"proposed":proposed,
                        "confidence":conf,"seedNotes":notes})
    doc = {"schema":"docs/MOVE-AXIS-SCHEMA.md","generated_by":"build_move_conversions.py",
           "count":len(records),"moves":records}
    with open(OUT,"w",encoding="utf-8") as f: json.dump(doc,f,indent=2,ensure_ascii=False)
    hi=sum(1 for r in records if r["confidence"]=="high")
    print("WROTE",OUT); print("moves:",len(records),"high-conf:",hi,"low-conf:",len(records)-hi)

if __name__=="__main__": main()
