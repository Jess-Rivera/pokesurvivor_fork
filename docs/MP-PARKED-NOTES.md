# MP parked notes (cloud / multiplayer phase only)

Moved verbatim out of TODO.md on 2026-10-17. Do NOT act on any of this until Jess switches to the cloud/MP phase. Numbers (prices, benchmarks) were verified on 2026-10-17 and will drift, so re-check at phase start.

---

- MP connection reliability + architecture (PARKED DESIGN NOTE, cloud/MP phase only — Jess thinking
  ahead 2026-10-17, NOT to be built until he switches phase). Problem: the inherited MP sometimes
  fails to connect. Root cause is NOT sloppy code — it is inherent to browser WebRTC peer-to-peer:
  needs signaling (Firebase today) + NAT traversal (STUN), and when STUN fails the only path is TURN
  relay (the Cloudflare worker, capped $5/mo). Flaky NAT/firewall combos + a rate-limited/missing TURN
  = failed connects. Swapping TURN providers makes the RELAY cheaper/more reliable but does NOT fix the
  P2P flakiness — architecture does.
  Jess's idea: "host hosts the room, others connect by IP." Hard constraint: a browser page CANNOT be
  a listening server (no inbound sockets). So true direct-IP hosting needs a native helper the host
  runs alongside the game. Options considered:
    * Thin-client / authoritative split (browser = display + input only; sim runs elsewhere):
      - Flavor A: authoritative SERVER runs the whole simulation. Most robust, kills WebRTC/NAT
        entirely (clients make one outbound WebSocket). BUT near-total rewrite (split sim vs view +
        state-sync protocol) AND server does per-tick CPU for every room — a bullet-heaven with
        hundreds of entities blows past a $5/mo VPS fast. Overkill for a hobby co-op game.
      - Flavor B (RECOMMENDED for this game): host's browser keeps running the sim, but players
        connect through a WebSocket RELAY server (stable public IP) instead of P2P. Kills the
        NAT/TURN lottery (browsers allow outbound WS to an IP), relay only passes messages so a
        ~$5/mo VPS running a Node relay handles it at fixed/predictable cost. Smaller change than A
        (add relay + thin-client render/input mode to js/net/). Tradeoff: host authority (host leaves
        = run ends; host could cheat) — FINE because this fork is co-op PvE, not competitive PvP.
    * Static file hosting is a separate, ~free problem (Cloudflare Pages/Netlify/Vercel; NOT GitHub
      Pages per Jess). Don't conflate with the MP backend cost.
    * TURN provider options if staying on WebRTC: Cloudflare (current), Metered.ca (free tier),
      Twilio (usage-priced), or self-hosted coturn on a ~$5/mo VPS (fixed predictable cost, most
      robust-per-dollar). VERIFY current pricing/free-tiers with real web research when the phase
      starts — do not trust remembered numbers.
  Bottom line to revisit at MP phase: for co-op PvE at ~$5/mo, Flavor B (host-authority + WebSocket
  relay on a cheap VPS) is the sweet spot — targets the real complaint (connect reliability) without
  a full rewrite or runaway server CPU cost. Do a real cost/feasibility estimate (concurrent rooms per
  $5 VPS, bandwidth per room at this game's entity counts) before committing.

  HOSTING PROVIDER RESEARCH (2026-10-17, deferred — numbers verified via web, will drift, re-check at
  phase start):
  - Context: 2026 saw broad budget-VPS price hikes (Hetzner shared vCPU +30-50%). "Cheap VPS" is less
    stable than it was; prefer providers with monthly price caps / flat pricing.
  - The binding metric for the SIM role is SINGLE-CORE performance. The cheap SHARED-vCPU boxes bench
    poorly on raw CPU (vpsbenchmarks: Hetzner CX22 raw-CPU grade E on old Skylake; Vultr "High
    Frequency" 2GB graded F at $12/mo — pricier did NOT win single-core). Shared vCPU = noisy
    neighbors. For a RELAY role, CPU grade is irrelevant — any $4-6 box over-serves; pick on
    location + billing (Hetzner CX23 ~€5.49 EU-only, or Contabo 4vCPU/8GB <$5 with US regions).
  - THE ANSWER for the sim role = DEDICATED-vCPU Ryzen VPS (not shared). Look for "dedicated vCPU" +
    high-clock Ryzen (7950X/9950X/X3D). Standout: AlphaVPS Ryzen — dedicated Ryzen 9 9950X/7950X,
    claimed PassMark single-thread 4000+ (≈2-3x a shared Skylake vCPU, near desktop class), DDR5 ECC,
    Gen4 NVMe, FROM ~€2.99/mo (~€2.54 annual), EU + LA. Also Lumadock (dedicated 7950X core), Hetzner
    CCX (dedicated tier, pricier post-hike), and game-server hosts (eugamehost/gameserverkings/
    pingperfect: overclocked 7950X3D up to 5.8GHz + DDoS protection, built for exactly modded-MC/Rust/
    game-sim workloads, often 6-mo intro rates — check renewal price). Caveats: PassMark 4000+ is a
    marketing figure (benchmark the real ms/tick), "from €2.99" is likely the smallest tier (confirm
    cores/RAM), AlphaVPS is a smaller provider (weigh reliability).
  - AWS: wrong shape for a capped ~$5/mo hobby backend. Usage-based + egress (~$0.09/GB out) risks bill
    surprises for a traffic-relaying game. Only Lightsail fits (flat pricing, bundled transfer) if you
    want the AWS ecosystem, still pricier/weaker-per-$ than budget hosts. EC2 free tier = $0 for year 1
    (weak box, expires). GameLift = enterprise overkill.
  - Self-hosted mini-PC (considered, rejected-ish): best raw price/perf for the SIM (real dedicated
    fast core, ~$1-4/mo electricity, break-even vs VPS ~6-18mo) BUT reintroduces the exact reachability
    problem — home NAT/port-forwarding, CGNAT (may be impossible on some ISPs), dynamic IP (needs
    DDNS), plus home-network security exposure + you own uptime + residential upload cap. Clean hybrid
    if ever wanted: mini-PC runs the sim, cheap VPS is the public relay (strong core at home, stable
    reachability + unexposed home net). For now VPS alone is simpler.
  - 5-rooms-per-core math (the whole thing hinges on T = sim ms/tick/room, UNMEASURED): rooms/core ≈
    1000/(60*T), derate ~65%. On a PassMark-4000 dedicated Ryzen core: T≤2ms -> ~5 rooms @60Hz;
    T≈3-4ms -> 2-3 @60Hz but ~4-5 if the server tick drops to 30Hz (clients interpolate). So 2 rooms is
    a conservative floor at ~€3/mo (great value); 5 rooms is realistic with 30Hz + entity budget.
    ACTION at phase start: rent a dedicated-Ryzen VPS HOURLY, run the extracted-sim ms/tick benchmark
    on it, plug in real T. Hardware class is right; the engineering (tick rate + entity budget) decides
    the room count, not the wallet.

  FPS / CPU / COST reasoning (same 2026-10-17 thinking-ahead chat, all deferred):
  - FPS vs host: in the CURRENT P2P model each client simulates its OWN view ("each computer executes
    the attacks of ITS player"), so a player's FPS depends on THEIR machine, not a central host. Under
    a host-authority relay (Flavor B) the HOST's browser simulates for everyone -> host CPU carries 4
    players + huge hordes (the "tough call": transport choice fixes CONNECT, not WHO simulates; one
    host-in-browser always = that host's CPU runs the fight).
  - The trilemma (pick two, can't have all three cheaply for a hundreds-of-entities co-op game):
    reliable-connect + cheap + no-host-bottleneck. Relay+host-authority = reliable+cheap but host
    bottleneck. Each-client-sim (current) = cheap + no-bottleneck but flaky connect + hard to keep
    sims in sync. Dedicated server-sim = reliable + no-bottleneck but real $ + big rewrite.
  - Capped private VPS plan (Jess's idea, SOUND): run one small VPS for Jess+friends, cap concurrency
    (e.g. 20 players / 5 rooms EVER), ship self-host instructions so others run their own VPS. Caps
    bound COST predictably. CORRECTION held: a player cap bounds cost, but the ENTITY CEILING is set by
    sim-location (host PC under relay / server CPU under authoritative), NOT by the VPS. Also: a VPS is
    a server you now operate (patching, open port, DDoS surface) — counter to the current zero-server
    "open dev.html" design.
  - Why cheap Minecraft servers (5-10/mo, 5+ players, big modpacks) work and why it VALIDATES the plan:
    MC is cheap because it is NOT naive — 20 TPS (vs our 60), ticks only loaded chunks near players
    (interest management), mob CAPS, and most entities idle. A bullet-heaven is heavy only in the NAIVE
    form (60Hz, thousands of uncapped entities ALL moving/colliding/spawning, full collision). Borrow
    MC's discipline and a cheap VPS running ~5 BUDGETED rooms is realistic. The four knobs that get you
    there: (1) co-op entity/spawn CAP scaled sub-linearly with player count (not naive 4x); (2) server
    tick 20-30Hz with CLIENT INTERPOLATION (looks 60fps, ~halves server CPU); (3) interest management /
    off-screen culling (simulate near players only); (4) the room/player cap already proposed.
  - How to actually size it (the cost math, do when phase starts): measure sim-only ms-per-tick (T) for
    1 room (4 players, target entity count). Rooms/core ≈ 1000 / (60 * T), then derate to ~60-70% load
    (÷~1.5). Lowering tick to 30Hz halves the 60 factor. Measure T two ways: (a) in-browser profile on
    dev.html with ?dev maxed + a huge mob, wrapping the SIM step (exclude render) in performance.now();
    (b) rigorous = headless Node harness (extract sim, stub G.FX/canvas) run ON THE VPS. 
  - ms-per-tick vs FPS: ms/tick is the FPS CEILING, not the FPS. 60fps = 16.67ms budget/frame; you only
    drop frames when sim+render EXCEEDS budget (then FPS≈1000/ms). Server cost cares about total CPU
    time (60 * T per room), not "smoothness". Render ms stays on the CLIENT; only SIM ms moves to the
    server — so separate sim-time from render-time when profiling.
  - ms-per-tick is CPU-dependent: driven by SINGLE-CORE speed + cache (not core count, not cooling
    unless throttling). A 5800X3D (big L3 cache helps the cache-heavy collision grid) posts far lower T
    than a laptop; a VPS vCPU is often SLOWER per-core than a modern desktop. => NEVER size cost from a
    desktop measurement; measure on VPS-class silicon (or derate 2-4x). Same T feeds two uses: client
    FPS headroom AND server rooms-per-core.
