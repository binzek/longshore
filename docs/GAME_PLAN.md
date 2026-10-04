# LONGSHORE: Master Plan

A small-scale multiplayer 3D climate game set on the Kozhikode / Malabar coast, Kerala, India.
Born at the Climate Craft Game Jam (Sustera x TinkerHub, TinkerSpace Kochi, 4 Oct 2026). Intended to live on as a long-term portfolio build.
Author and owner: Wajid (binzek). Plan compiled 4 Oct 2026.

> HOW TO USE THIS FILE (Claude Code): treat it as the product spec and the source of truth for facts.
> Technical and implementation decisions are yours, within the "Technical preferences" section.
> Anything marked **[TUNE]** is a starting value to adjust through playtesting. Anything marked **[VERIFY]** must be checked before it ships.
> Never put a real-world number on screen unless it exists in `src/data/facts.json` with a source. See section 8.

---

## 0. Working agreement for Claude Code

1. **Playable at every milestone.** After each milestone the deployed build must be enjoyable, not choppy. Never merge a half-working milestone to `main`. Work on branches and promote only after a two-minute playthrough passes.
2. **Vertical slice first, then widen.** Build the smallest complete game (M2), then add depth.
3. **Pure simulation, separate from rendering.** `simulate()` is a deterministic, seeded, side-effect-free function. Rendering and networking only consume its output.
4. **Every network and AI feature has a local fallback and an on/off flag.** If Supabase or the AI fails, the game silently continues solo with bots and static text.
5. **Never block the UI on a network request.** Preload assets behind a loading bar.
6. **Small steps, tests, commits.** One change at a time, run Vitest, commit when green.
7. **Facts are data, not code.** All real numbers live in `facts.json` with ids, sources, and confidence. Narration text lives in JSON too.
8. **No secrets in the repo or the browser.** API keys live in Supabase Edge Function secrets.
9. **Ask Wajid when a decision changes the design.** Make technical calls yourself.
10. **Wajid is a frontend developer new to game building.** Keep code readable and modular, with short comments explaining non-obvious game logic.

---

## 1. Vision and design pillars

**One-liner:** Up to five people each run a part of a Kerala coastal town (a fisher, a shack, a household, a mangrove nursery, a panchayat). Their choices decide how badly a slowly rising climate pressure hurts the coast when the game time-jumps to 2050 and then 2100.

**Why this shape:**
- The partner organisation (Sustera) said a game is "an optical space to experience something and jump times" that works better than an awareness poster. Their examples were everyday trade-offs: bottled vs tap water, AC rooms vs park meetings, cool-weather travel vs summer holidays.
- Wajid is from Kozhikode and has worked on this coast. The setting is personal and local.

**Pillars**
1. **Honest pressure.** Sea-level rise and warming come from global emissions that five people on a beach cannot stop. So pressure rises on a fixed schedule in every run. Players only control how much local damage it does. Everyone can play well and still lose something.
2. **Delayed consequences.** A cheap decision now shows its cost a jump later. The time jump is the dramatic reveal.
3. **Private gain vs shared meters.** Every role has a private score. The best personal move usually hurts a shared meter, and the damaged meter later hurts you.
4. **Short and finished.** A fixed 6 to 8 minute run with a real ending, in the spirit of *We Become What We Behold*.
5. **Real facts, labelled.** Real data and simulated results are always visually distinguishable.
6. **First impression is the product.** A beautiful, fluid, minimal UI matters as much as the logic. The backdrop is a calm, minimalist, slightly polygonal (flat-shaded, low-poly) coast that is always on screen, behind everything. Clash of Clans is a reference only for that idea of a full-screen living backdrop, not for its 3D style or its heavy textures. Overlays are glassy, translucent and minimal, set in serif type, with soft number transitions and gentle audio feedback.

**Reference games (feel only):** Clash of Clans (only the idea of a full-screen living backdrop; not its visual style, UI or textures), *We Become What We Behold* (fixed short arc, final line), tycoon games (decisions with numbers), Fate of the World and Eco (systems-as-argument).

---

## 2. Game overview

### 2.1 Run structure (about 7 minutes, fixed)

| Beat | Time (approx.) | What happens |
|---|---|---|
| Title and loading | 15 to 20 s | Loading bar, sea ambience starts on first tap |
| Intro narration | 30 s | 3 to 5 short lines over the 2026 coast |
| Act 1: 2026 decisions | 120 s timer | Each role makes 3 decisions; bots fill missing roles |
| Time jump 1 | 25 s | Scene morphs to 2050, overlays change |
| Act 2: 2050 decisions | 120 s timer | Choices adapt to what happened; some options exist only because of Act 1 |
| Time jump 2 | 25 s | Scene morphs to 2100 |
| Act 3: epilogue | 45 s | Reveal of 2100; (stretch goal: one last small action per role) |
| Ending | 40 s | Meters, each role's private score, one final line about what the group did, replay |

Act 3 is a reveal, not a decision round, until M5.

### 2.2 Jump years (chosen for coverage by published Kerala projections)
- **Act 1 = 2026** (today).
- **Act 2 = 2050**, the most common mid-century horizon (NASA tool for Kochi; IPCC AR6 tables; Woodwell/KSDMA heat analysis).
- **Act 3 = 2100**, the standard endpoint (CSTEP Kozhikode value; Kochi AR6 value).
- CSTEP also mapped 2040, 2060 and 2080, so a shorter jump is possible later. 2036, 2046 and 2070 have little local published coverage.

### 2.3 Shared meters (all 0 to 100, higher is better, start at 70 **[TUNE]**)

| Meter (internal) | UI label | Meaning | Visible in scene as |
|---|---|---|---|
| `shoreBuffer` | Shore Buffer | Sand, mangrove and wall protection against waves and erosion | Beach width, mangrove count, wall condition |
| `fishStock` | Fish Stock | Health of local fish populations | Fish shoals, boat catch, jetty activity |
| `cleanCoast` | Clean Coast | Litter and plastic on the beach | Debris on sand, water clarity |
| `coolness` | Local Heat Relief | Shade, trees, local cooling (inverse of local heat stress) | Haze, sky colour, tree cover |

### 2.3b Roles in one line
Fisher (offshore boat), Beach shack owner (shoreline), Household (behind the shore), Mangrove nursery NGO (estuary), Panchayat officer (office near the jetty). Details in section 4.

### 2.4 Pressure (exogenous, identical in every run)

Illustrative **game approximations, not predictions**. The UI must say "simplified simulation".

| Parameter | 2026 | 2050 | 2100 | Basis |
|---|---|---|---|---|
| Real sea-level rise vs today | 0 m | +0.23 m | +0.75 m | NASA tool value for Kochi (2050, secondhand, Med); CSTEP Kozhikode SSP2-4.5 (2100) |
| Sea plane shown in scene | 0 | x3 exaggeration, labelled "scene exaggerated" | x3 | Readability on phones |
| Monsoon shock events per act | 1 | 2 (one late-season burst) | 3 | Reji 2025 shift to later heavier bursts; 2 to 3x more frequent extreme sea levels |
| Heat factor | 1.0 | 1.3 | 1.7 | Relative. About +1 to 1.4 C by 2050 (Woodwell/KSDMA 2024). No sourced Kerala 2100 figure |
| Fish baseline productivity | 1.0 | 0.85 | 0.7 | Directional (CMFRI climate attribution), not a forecast **[TUNE]** |

### 2.5 Damage model (starting design **[TUNE]**)

```
stewardship[m] in [-1, +1]   // sum of all roles' choice effects on meter m, normalised
mitigation[m]  = clamp(0.35 + 0.35 * stewardship[m], 0, 0.7)    // cap at 70%
baseDamage[m]  = base[jump][m] * pressureFactor[jump][m]
newMeter[m]    = clamp(oldMeter[m] - baseDamage[m] * (1 - mitigation[m]) + restore[m], 0, 100)
```

Starting `base` damage in meter points:

| Jump | shoreBuffer | fishStock | cleanCoast | coolness |
|---|---|---|---|---|
| 2026 to 2050 | 22 | 15 | 18 | 15 |
| 2050 to 2100 | 30 | 20 | 20 | 22 |

Design intent: with perfect play the coast still loses roughly 15 to 25 points per meter by 2100. With bad play it falls near the floor. The cap at 70% mitigation keeps the honest message: **the coast always changes.** Tune with simulated runs in tests.

### 2.6 Private scores and exposure
Each role has a private score 0 to 100. Choices raise it immediately (`privateGain`). In Act 2 the score is multiplied by `(0.5 + 0.5 * exposureMeter/100)` where each role is exposed to a specific meter:
- Fisher: fishStock. Shack: cleanCoast and coolness (average). Household: coolness and shoreBuffer. NGO: shoreBuffer and fishStock. Panchayat: average of all four (popularity).

### 2.7 Endings
- `4 meters x 3 bands (low <34, mid 34 to 66, high >66) = 81` ending states. Pre-write a short ending line for each (see section 10). The game also reports each role's private outcome (thrived, coped, lost) and one sentence about the gap between private and shared results.
- Always end by stating, plainly, that **the pressure was identical in every run**, and that the players' choices decided how much damage reached the coast.

---

## 3. Honest-science rules (non-negotiable)

1. **Two layers, never mixed.** Layer A: cited real facts (static, shown as "REAL DATA" overlays with a source tag). Layer B: simulated results (computed, shown as "SIMULATION" overlays). Visually distinct stickers.
2. **AI never creates facts.** AI may only narrate final numbers that the simulation produced.
3. **No false precision.** No exact 2100 numbers presented as predictions. Ranges where sources conflict (see section 8).
4. **Avoid blame framing.** Structural limits are part of the game: some options are unavailable ("no bus on this route"; "the wall is already crumbling"). The ending reminds the player that the pressure is shared and systemic.
5. **Label the exaggeration.** The sea plane is exaggerated for readability; say so.

---

## 4. Roles (pre-defined elements, mechanics, effects)

Each role is a **data config** (JSON) interpreted by a few reusable decision widgets. Adding a role should cost minutes.

Reusable widgets: `slider`, `split` (budget across N sliders), `placement` (tiles), `haul` (push-your-luck), `cardDraft`, `toggleSet`.

Config shape (illustrative):

```json
{
  "id": "fisher",
  "label": "Fisher",
  "sceneAnchor": "boat_01",
  "private": { "name": "Income", "start": 40 },
  "exposure": { "fishStock": 1.0 },
  "decisions": [
    {
      "id": "haul",
      "widget": "haul",
      "params": { "maxRounds": 5, "meshOptions": ["small", "medium", "large"] },
      "effects": { "privateGain": 0.6, "stewardship": { "fishStock": -0.4 } }
    }
  ],
  "bot": { "personalities": ["greedy", "balanced", "steward"] }
}
```

### 4.1 Fisher (boat offshore)
- **Mechanic: push-your-luck haul.** Up to 5 rounds. Each round the player chooses a mesh size (small / medium / large) and either hauls again or heads home. Smaller mesh gives more fish now but a higher share of juveniles. A bust chance rises with juvenile share and wipes the load.
- **Real hooks:** sardine minimum legal size 10 cm and mackerel 15 cm (CMFRI 2015); sardine crashed in 2021 from overfishing and a warming sea together; 52-day monsoon trawl ban 9 June to 31 July.
- **Meter effects:** fishStock (negative with small mesh and over-hauling). **Private score:** income.
- **Pressure event (Act 2):** a "sardine vanishes" shock, driven by Pressure not by the player. Baseline productivity 0.85 in 2050, 0.7 in 2100 **[TUNE]**.
- **Decisions per act:** haul (widget), ban-window compliance (yes/no), gear choice (toggle).

### 4.2 Beach shack owner (shoreline)
- **Mechanic:** `toggleSet` under a budget: plates (single-use vs steel), fish (local vs trucked), cooling (fans vs AC).
- **Real hooks:** beach plastic 1.66 pieces/m^2 on Kerala beaches; CRZ no-development zones.
- **Effects:** cleanCoast (single-use hurts), coolness (AC adds a small local heat load and costs more when heat is high). **Private score:** profit.
- **Ordinal effects only** until household/cooling data is sourced (section 8 gaps).

### 4.3 Household (behind the shore)
- **Mechanic:** `split` of a rupee budget across four sliders: cooling, water source (bottled vs tap or filter), transport (two-wheeler / bus / car), food.
- **Effects:** cleanCoast (bottles), coolness. **Private score:** comfort plus savings.
- **Structural limits:** some choices are locked (for example a bus that does not run on this route) to avoid pure blame.
- **Effects stay ordinal** (more or less) until sourced.

### 4.4 Mangrove nursery NGO (estuary edge)
- **Mechanic: tile placement.** 12 estuary tiles (types: mudflat, open beach, high-energy shore) and a limited number of saplings (8 **[TUNE]**). Saplings on wrong tiles die. Above a density cap, extra saplings are wasted. Saplings take one act to "grow in".
- **Real hooks:** median 62% wave-height reduction in the first 100 m of mangrove, about 90% after 500 m; tidal flats account for about 70% of the reduction; young mangroves protect less (age matters). Kadalundi-Vallikkunnu Community Reserve (153.54 ha, est. 17 Oct 2007) as the local inspiration.
- **Meter effects:** shoreBuffer, fishStock (nursery habitat). **Private score:** funding and goodwill.
- **Design rule to test:** planting fails when species or site is mismatched. Only show this as a real fact once sourced.

### 4.5 Panchayat officer (office near the jetty)
- **Mechanic: policy card draft.** One card per act, from a hand of 5, under a budget and a popularity score:
  - **Seawall:** protects its own stretch, shifts erosion one stretch downdrift, and decays unless maintained (real: only 28% of Kerala seawalls are intact).
  - **Setback rule (50 m):** raises shoreBuffer, lowers shack income.
  - **Fishing ban window (52 days):** cuts fisher income now, raises fishStock later.
  - **Waste drive:** raises cleanCoast, costs budget.
  - **Relocation (Punargeham-style):** shoreBuffer loss hurts households less, high cost, uptake is partial (real: fewer than half of eligible families have agreed to move).
- **Private score:** popularity.
- **Spatial model:** keep `shoreBuffer` as a single number until M3. Then optionally split the coast into 6 stretches so seawall downdrift works visibly.

### 4.6 Optional later roles (not in M0 to M3)
Kudumbashree fish vendor or Haritha Karma Sena worker (waste sorting vs selling), Beypore boatbuilder, resort developer, ferry operator.

### 4.7 Bots
- Every role has a seeded bot policy with a personality (`greedy`, `balanced`, `steward`) drawn from the run seed, so runs vary.
- A room always starts with every role filled by a bot. Humans take over roles as they claim them.

---

## 5. Simulation specification

### 5.1 Contract
```ts
simulate(prevState: WorldState, choices: Record<RoleId, Choice[]>, ctx: { seed: number; jump: 1 | 2 })
  => { nextState: WorldState; events: SimEvent[]; privateScores: Record<RoleId, number> }
```
- Pure and deterministic. Same seed and choices give the same result on every client.
- Seeded RNG: use mulberry32 or equivalent.
- Clamp every choice to its valid range inside `simulate()`. That is enough anti-cheat for a jam.

### 5.2 State (illustrative)
```ts
WorldState = {
  year: 2026 | 2050 | 2100,
  meters: { shoreBuffer, fishStock, cleanCoast, coolness },   // 0..100
  roles: Record<RoleId, { privateScore: number; flags: string[] }>,
  pressure: { seaLevelM, monsoonEvents, heatFactor, fishBaseline },
  tiles?: MangroveTile[],        // NGO placement
  stretches?: Stretch[],         // optional, M3+
}
```

### 5.3 Tests (Vitest) to write early
1. Determinism: same seed and choices give an identical result.
2. Clamping: meters stay within 0 to 100, choices stay within range.
3. Mitigation cap: never exceeds 70%.
4. Monotonic sanity: more stewardship never makes a meter worse.
5. Coverage: the 81 band states all map to an ending line.
6. Full bot-only runs across 1,000 seeds: the distribution of final meters is plausible (no crashes, no all-same outcomes).

---

## 6. Scene and time-jump specification

### 6.1 Scene (low-poly Malabar coast diorama)
- A full-screen 3D backdrop: sea, shore, sky. Camera pans with inertia inside bounds. No free movement.
- **Visual style:** minimalist and slightly polygonal. Flat-shaded low-poly shapes, a restrained palette (about 5 to 6 muted colours), few props, soft light and fog, no heavy textures and no cartoon-game look. Any downloaded low-poly model should be recoloured to this palette, or replaced with simple primitives.
- Kozhikode-flavoured layout (inspiration, not accuracy): mangrove estuary on one side (Kadalundi-like), fishing jetty and boats (Beypore / Puthiyappa-like), a stretch of beach shacks, houses behind the shore, panchayat office near the jetty.
- Each role is a small, softly pulsing **glass marker** over its object. Tapping a marker opens that role's panel.
- Atmosphere: gulls, sea ambience, soft music, warm light at the start, harsher and hazier by 2100.

### 6.2 Time-jump morphing (state-driven, not generated imagery)
Drive everything from one parameter `t` (0 to 1) per jump. Interpolate:
- Sea plane height (using the exaggerated value).
- Fog density and sky colour (haze increases with `coolness` damage).
- Instanced mangrove count and tree count (from `shoreBuffer` and `coolness`).
- Debris decals on the sand (from `cleanCoast`).
- Boat count and fish shoals (from `fishStock`).
- A few pre-authored shoreline variants (healthy, eroded, walled), blended or swapped with a dissolve.
Do not use image generation for backdrops at runtime. State-driven morphing is faster, deterministic, and always matches the on-screen numbers.

### 6.3 Overlays
- Act 1: "REAL DATA" overlay stickers anchored to scene objects (see section 8).
- After each jump: "SIMULATION" stickers showing meters before and after, plus REAL DATA stickers for the future year's published projection.

---

## 7. UI, audio and narration

### 7.1 Screens
Title / loading, lobby (room link, role pick), intro narration, world with pins, role panel, lock-in (waiting for others, bots auto-fill after a timeout), time jump, epilogue, ending (meters, role scores, final line, replay and share).

### 7.2 Feel (minimal, glassy, serif)
- **Overlays:** translucent glass panels (soft blur of the scene behind, thin 1 px light border, very subtle shadow), generous spacing, small restrained type, thin-line icons. Nothing chunky, glossy or heavily textured. Panels fade or slide in gently.
- **Palette:** a restrained set of about 5 to 6 muted colours shared by the backdrop and the UI, so overlays feel like part of the scene.
- **Type:** serif fonts throughout. Pick one display serif for titles and narration and one text serif for panels and numbers (Google Fonts candidates, SIL OFL, **[VERIFY]** licence and glyph coverage: Fraunces, Playfair Display, Cormorant Garamond, Newsreader, Source Serif 4). Check for tabular (fixed-width) figures so ticking numbers do not jitter.
- **Motion:** numbers ease up and down smoothly; small, calm micro-animations on every action; no bouncy or cartoon effects.
- **Audio:** a soft, short sound on every action. Ambient sea and gulls. Light music that shifts mood across acts.
- **Performance:** glass uses `backdrop-filter`, which can be costly on low-end phones. Use it on few, small surfaces and provide a solid semi-transparent fallback.
- Mobile first (portrait and landscape), touch pan, no hover dependencies.

### 7.3 Narration beats
- Intro (3 to 5 lines), jump 1, jump 2, epilogue, and an ending line. **Wajid writes the voice**; Claude Code scaffolds placeholders and the JSON structure. Short, plain, local.
- AI may add one flavour line per beat (section 10), always with a static fallback.

---

## 8. Fact pack (real numbers, sources, confidence)

Compiled 4 Oct 2026. Confidence: **High** = primary or peer-reviewed or official; **Med** = credible secondary or modelled; **Low** = single news quote. Claude Code must create `facts.json` with an `id`, `text`, `value`, `unit`, `year`, `source`, `url`, `confidence`, `supports` (role or meter), and `overlayLine` for each row, and **re-check the Low and Med rows against the source URL before they ship**.

### 8.1 Sea level

| id | Fact | Value | Source | Conf. | Overlay line |
|---|---|---|---|---|---|
| sl-01 | Kochi tide gauge long-term rise, 1940 to 2022 | 1.91 +/- 0.20 mm/yr | ScienceDirect 2026, Kochi PS-InSAR + tide gauge + altimetry. https://www.sciencedirect.com/science/article/pii/S2590061726001894 | High | "Kochi's sea has risen about 2 mm a year since 1940." |
| sl-02 | Recent acceleration, 1988 to 2022 (altimetry 1994 to 2022: 4.15 +/- 0.12) | 4.14 mm/yr | Same | High | "Since the late 1980s it rises about twice as fast." |
| sl-03 | Indian Ocean rise 1993 to 2015 | 3.3 mm/yr | MoES 2020 via CSTEP 2024 | Med | "The Indian Ocean rose 3.3 mm a year from 1993 to 2015." |
| sl-04 | Kozhikode rise by 2100, SSP2-4.5 | 75.1 cm | CSTEP 2024 (IPCC AR6 on Kochi gauge) | Med | "By 2100, mid-emissions: about 75 cm higher at Kozhikode." |
| sl-05 | Kochi gauge by 2100, SSP3-7.0 | about 0.71 m | EGU 2024 abstract, ADS | Med | "About 0.7 m higher by 2100 under high emissions." |
| sl-06 | Kochi by 2050 (also 0.11 m 2030, 0.30 m 2060) | 0.23 m | NASA tool values via a 2024 Springer review (secondhand) | Med | "By 2050, about 23 cm higher near Kochi." |
| sl-07 | Coastal subsidence adds to relative rise (most of coastal Kerala >5 mm/yr, Kuttanad >20 mm/yr) | mm/yr | EGU 2024 abstract, MT-InSAR | Med | "In places the land is sinking too." |
| sl-08 | Extreme sea levels 2 to 3 times more frequent on the Arabian Sea coast | factor | Sreeraj et al. 2022 via CSTEP 2024 | Med | "High-water extremes are 2 to 3 times more frequent." |

**Gaps:** SSP1-2.6 and SSP5-8.5 values for Kozhikode and Kochi are not yet found. Wajid can read them from the NASA Sea Level Projection Tool for the Kochi gauge. Until then label Act 3 as "mid-emissions". Conflicting observed rates exist (CSTEP: 1.58 mm/yr for 1987 to 2021). Show ranges, not single figures.

### 8.2 Erosion and seawalls

| id | Fact | Value | Source | Conf. | Overlay line |
|---|---|---|---|---|---|
| er-01 | Kerala coastline length | 592.96 km | NCCR via Kerala Kaumudi | Med | "Kerala has about 593 km of coast." |
| er-02 | Share of Kerala coast eroding, 1990 to 2018 | 46% (NCCR). MoES says 41%. NCESS 2018 said about 60% (different method) | ICSF / NCCR; ICSF compilation; Mongabay 2022 | High (46%), Med (others) | "Almost half of Kerala's coast is losing land." Use "41 to 46%". |
| er-03 | Kerala seawalls surveyed Aug 2022: 330.8 km walls, 459 groynes | 28% of walls intact, 51% of groynes intact, 81 km of wall fully disintegrated | NCCR survey (Springer Nature Communities, 2025) | High | "Kerala has 331 km of seawalls and only 28% are fully intact." |
| er-04 | Kozhikode: 78 km coast, 53 km with seawalls, 16 groynes | about 10.5 km intact, 28.1 km partly damaged, 14.4 km poor or collapsed | Veeravalli blog on NCCR survey, 2025 | Med-High | "Kozhikode: 53 km of seawall, about 10 km fully intact." |
| er-05 | Kozhikode beaches 10 to 25 m wide persist near Kozhikode beach, Vellayil, Puthiyappa, Kappad; beaches gone at Kadduka bazar, Vakkadavu, Bhatt Road, Thuvvapara | n/a | Same | Med | "At some Kozhikode spots the beach is gone." |
| er-06 | Erosion hotspots in Kozhikode CZMP draft | Koyilandy, Kappad, Elathur, Puthiyappa; cliffs near Quilandi, Elattur, Kappad | Kerala CZMA CZMP draft (Kozhikode) | High | "Koyilandy, Kappad, Elathur and Puthiyappa erode each monsoon." |
| er-07 | Structures as a driver | NCCR names fishing harbours, ports, groynes, seawalls and sand mining; an expert cites Beypore harbour | Kerala Kaumudi; ICSF | Med | "Harbours and walls can push erosion onto the next beach." |
| er-08 | About Rs 5,000 crore of protection projects proposed for 30 critical locations | Rs | TNIE via DredgeWire | Low-Med | (do not overlay) |

**Gap:** no verified rupees per km for Kerala seawalls. Use a relative game cost, not rupees.

### 8.3 Heat

| id | Fact | Value | Source | Conf. | Overlay line |
|---|---|---|---|---|---|
| ht-01 | Kerala's first officially confirmed heatwave | April 2024; Palakkad 41.8 C on 27 Apr, about 5.5 C above normal | The Hindu (Kochi), 28 Apr 2024 | High | "2024: Kerala's first confirmed heatwave." |
| ht-02 | Heat-related cases by 22 Apr 2024 | about 413 (324 in 2016 with 10 deaths); KSDMA says real numbers are higher | Same | Med | "Hundreds of heat illness cases in April 2024." |
| ht-03 | Kozhikode forecast late April 2024 | about 38 to 39 C, 2 to 4 C above normal; yellow alert; schools closed | Onmanorama; All India Radio | Med-High | "Kozhikode hit about 39 C in April 2024." |
| ht-04 | Heat index in Palakkad, March 2024 | about 50 C | The Hindu | Med | "Humid heat can feel like 50 C." |
| ht-05 | Projected warming by 2050 vs 1990 to 2020 | at least about 1 C, up to about 1.4 C under SSP5-8.5 | Woodwell Climate Research Center with KSDMA, 2024 | Med | "By 2050 Kerala is expected to be about 1 to 1.4 C warmer." |

**Gap:** no sourced Kerala 2100 temperature figure. Keep Act 3 heat relative.

### 8.4 Monsoon and extremes

| id | Fact | Value | Source | Conf. | Overlay line |
|---|---|---|---|---|---|
| mo-01 | Southwest monsoon rain over Kerala declined over 1871 to 2005; post-monsoon rose | trend | Krishnakumar et al. 2009, Atmos. Environ. | High | "Over 130 years Kerala's June to September rain declined." |
| mo-02 | Rate of decline | about 3 mm/yr over 100 years, 6.7 mm/yr after 1960 | Theor. Appl. Climatol. 2021 | Med-High | (do not overlay) |
| mo-03 | Recent nuance (1990 to 2020): decline slowed; June to July drier, August to September wetter | trend | Reji et al. 2025, Climate Dynamics 63:229 | High | "Monsoon rain is shifting later and arriving in heavier bursts." |
| mo-04 | 2018 Kerala floods | 433 deaths, 5.4 million affected, 1.4 million displaced, recovery needs INR 31,000 crore | UNDP, Kerala PDNA | High | "2018 floods: 433 lives lost, 5.4 million affected." |

**Gaps:** 2019 floods, 2024 Wayanad landslide, and projected monsoon change are not researched. Do not overlay until sourced.

### 8.5 Fisheries

| id | Fact | Value | Source | Conf. | Overlay line |
|---|---|---|---|---|---|
| fi-01 | Kerala marine landings 2024 | 6.10 lakh t, down 4% on 2023 | PIB / ICAR-CMFRI | High | "Kerala landed 6.1 lakh tonnes in 2024, 4% less than 2023." |
| fi-02 | Oil sardine 2024 | 1.49 lakh t (+7.6%); mackerel 61,490 t (-16%); sardine price swung from Rs 400 to Rs 30 per kg | Agro Spectrum (CMFRI release); Onmanorama | High | "Sardine prices swung from Rs 400 to Rs 30 a kilo in 2024." |
| fi-03 | Oil sardine collapse 2021 | 3,297 t, lowest since 1994, 98% below the 1995 to 2020 average of 1.66 lakh t | CMFRI eprints | High | "2021: Kerala's sardine catch fell 98% below normal." |
| fi-04 | 2012 peak | 3.92 lakh t sardine of 8.32 lakh t total | Onmanorama | Med | (context) |
| fi-05 | Causes of sardine decline | overfishing and climate together (recruitment, food, timing) | Kripa et al. 2018, Frontiers in Marine Science | High | "Sardines crashed from overfishing and a warming sea together." |
| fi-06 | Minimum legal size | sardine 10 cm, mackerel 15 cm (CMFRI 2015, 58 species) | Onmanorama | Med | "Sardines under 10 cm are too young to catch legally." |
| fi-07 | Monsoon trawl ban | 52 days, 9 June to 31 July; traditional craft allowed; since 1988 | Kerala Kaumudi; All India Radio | High | "Every monsoon trawlers stay ashore 52 days so fish can breed." |
| fi-08 | Registered fisherfolk | about 10.5 lakh | The News Minute 2023 | Med | "About 10.5 lakh Keralites are registered fisherfolk." |

**Gaps:** no quantified evaluation of ban effectiveness; no Kozhikode fisher count; no income trend. Have the ban card reduce pressure on fishStock and describe the outcome as "expected".

### 8.6 Mangroves

| id | Fact | Value | Source | Conf. | Overlay line |
|---|---|---|---|---|---|
| mg-01 | Wave attenuation (216,000 model runs) | median 62% wave-height reduction in the first 100 m, about 90% after 500 m; tidal flats about 70% of the reduction | Communications Earth & Environment 2025 (Nature) | High | "100 m of mangrove can cut wave height by about 60%." |
| mg-02 | Range in the literature | 13 to 66% over 100 m, greatest at the seaward edge | TNC / Wetlands Intl review | High | (context) |
| mg-03 | Age matters | young fringes protect less | Scientific Reports 2024 | High | "Young mangroves protect less. They need years." |
| mg-04 | Kadalundi-Vallikkunnu Community Reserve | 153.54 ha, Kerala's first community reserve (17 Oct 2007), co-managed by Forest Dept and community; about 8 ha mangrove | KVCR site; ResearchGate | Med-High | "Kadalundi: Kerala's first community-run reserve." |
| mg-05 | Kadalundi species | Avicennia officinalis, Rhizophora mucronata, Excoecaria agallocha | Phytosociology study | Med | (asset hint) |
| mg-06 | Kerala mangrove area | 9.45 km2 | FSI ISFR 2023 via a secondary table | Low-Med **[VERIFY]** | (do not overlay until checked) |

**Gaps:** restoration cost per hectare, planting survival rates, and sites at Kallayi and Korapuzha are not sourced.

### 8.7 Waste and plastic

| id | Fact | Value | Source | Conf. | Overlay line |
|---|---|---|---|---|---|
| wa-01 | Plastic on Kerala beaches (59 sites, Jan to May 2019) | 1.66 pieces/m2; Malappuram 2.86/m2 (worst); about 170 million pieces, about 1,057 t | Thanal study via Down To Earth | Med-High | "Kerala beaches average 1.66 plastic pieces per square metre." |
| wa-02 | Compared with the world | about 3x the global beach average of 0.55/m2 | Mongabay India 2025 | Med | "About three times the global beach average." |
| wa-03 | Fishing debris on six Kerala beaches (2017 to 18) | plastic 73.8% of debris by count; fishing-related 36% of pieces | Daniel et al. 2020, Marine Pollution Bulletin | High | "A third of beach debris here is fishing gear." |

### 8.8 Governance and relocation

| id | Fact | Value | Source | Conf. | Overlay line |
|---|---|---|---|---|---|
| go-01 | CRZ 2019 no-development zone | 50 m from high tide line in CRZ-IIIA (rural, density >2,161/km2) once the CZMP is approved, otherwise 200 m; 200 m in CRZ-IIIB | Kerala CZMA, CRZ Notification 2019 | High | "In dense coastal villages: no building within 50 m of high tide." |
| go-02 | Kerala CZMPs approved for 10 districts incl. Kozhikode (Nov 2024); NDZ cut to 50 m in 122 local bodies | count | Exam-prep summaries of MoEFCC approval | Low-Med **[VERIFY]** | (do not overlay) |
| go-03 | Coastal belt population density | 2,168/km2 vs state average 810 | Kerala Kaumudi (NCCR) | Med | "Kerala's coast is packed: about 2,168 people per km2." |
| go-04 | Punargeham relocation scheme | Rs 2,450 crore; up to Rs 10 lakh per family (Rs 6 lakh land + Rs 4 lakh house) | Onmanorama 2019 | High | "Kerala offers up to Rs 10 lakh to fisher families who move back from the sea." |
| go-05 | Punargeham uptake | 22,174 families within 50 m; 9,104 agreed; 3,363 moved into houses and 738 into flats (about 2025) | Deshabhimani (government-friendly source) | Med | "Fewer than half of eligible families have agreed to move." |

**Gaps:** household and consumption data (bottled vs tap footprint, India AC growth, Kerala electricity demand, transport emissions, local vs trucked fish) and tourism data were not researched. Keep Household and Shack effects ordinal until Wajid sources them from IEA, CEEW, TERI or BEE.

### 8.9 Fact-handling rules for the code
- A number appears on screen only through a `factId`. Overlays render `overlayLine` plus a small source tag (publisher and year).
- Unknown or **[VERIFY]** facts are hidden by a `showInProduction: false` flag until checked.
- Conflicting figures are shown as ranges.
- Provide a debug view listing all facts, sources and confidence.

---

## 9. Multiplayer specification (M4)

- **Rooms:** share-link rooms of up to 5 players (no auto-matchmaking). Room code in the URL. Host starts the game.
- **Identity:** Supabase anonymous sign-in. No full auth.
- **Sync model:** clients broadcast only `{turn, role, choice}`. When the host holds a choice for every role (bots fill gaps via the seeded RNG after a timeout), the host broadcasts `lock`, and every client runs `simulate(seed, choices)`. Only choices are synced, never world state.
- **Channel:** one Supabase Realtime Broadcast channel per room. Presence carries `{playerId, role, ready, joinedAt}`.
- **Role claiming (race-safe):** a Postgres table `room_roles` with a unique `(room, role)` constraint; insert-or-fail.
- **Host election:** earliest `joinedAt` in Presence; if the host leaves, the next player takes over.
- **Reconnect:** rejoin the channel, request the choice log and a state hash from the host (or use Broadcast replay).
- **Fallback:** if realtime fails, the room silently becomes a solo run with bots.
- **Supabase Free limits (Oct 2026 docs):** 200 concurrent connections, 100 messages/s, 100 channel joins/s, 20 Presence messages/s, 256 KB Broadcast payload, 2M messages/month, 500 MB database, 2 active projects, 500K Edge Function invocations/month. **Free projects pause after one week of inactivity**, so wake the project before any demo. **[VERIFY]** current numbers before launch.

---

## 10. AI features (M5, optional, never blocks the game)

**Principle:** AI only narrates final numbers. It never produces facts.

### 10.1 Provider: xKiro (xkiro.com)
- Wajid has a free daily allowance: the Free plan is 500K tokens/day, and verifying on Telegram raises it to 1M tokens/day (per their pricing page); verify in the dashboard.
- Base URL `https://api.xkiro.com/v1`, OpenAI-compatible (`/chat/completions`) and Anthropic-compatible (`/messages`). Model IDs use a `vendor/model` prefix. The public `GET /v1/models` lists the catalog with an `access_tier` field (`free`, `paid`, `premium`). A Free account can call `free` models.
- `GET /v1/usage` (free to call) returns `free_tokens.used_today`, `limit_per_day`, `remaining`. Reported as counting since 00:00 UTC; the pricing page says the window slides, so rely on the endpoint.
- The daily total counts input, output, cache reads **and reasoning tokens**. Turn reasoning off explicitly (`reasoning_effort: "none"`). Set `max_tokens`. Free-model calls return 429 after the cap. Non-streaming requests time out at 95 seconds. `response_format` guarantees JSON syntax, not your schema, so validate it.
- **[VERIFY]** the free plan's requests-per-minute limit (not found in docs) and whether xKiro's Terms allow free-tier tokens to power a public app. Use a separate API key for the game with a spend limit.

### 10.2 Model preferences (free models seen in Wajid's xKiro list; unbenchmarked, test before trusting)
| Job | First try | Backup |
|---|---|---|
| Coding in the IDE | Codestral | Devstral 2, Qwen3 Coder Plus (1M context) |
| Runtime narrator (short, JSON) | Ministral 3 14B | Mistral Small 4 (reasoning off) |
| Bot flavour text | Ministral 3 8B or 3B | Command R7B |
| Copy drafts for Wajid to edit | Mistral Medium 3.5 | Command A |
| Malayalam first drafts (test only) | Tiny Aya Fire (South Asian focus) | Command A |
| Art (UI icons, textures) | SenseNova U1.5 Lite ($0 per image) | n/a |
- Avoid the free Qwen models for runtime: xKiro warns they run on shared capacity. Meta Muse Spark models are tagged "Paying accounts" and may not be callable.
- Image generation: free generations are limited per rolling 24 hours; overflow is charged to the wallet. Keep the wallet empty so overflow fails instead of billing.
- Malayalam: have a native speaker translate fixed lines once. Do not generate Malayalam live. Benchmarks show weak Malayalam performance even for strong models.

### 10.3 Narrator spec
- **Input:** `{act, meterBands, topRoleActions, seedLine}`. **Output:** JSON `{ "line": "<=160 chars" }`.
- Pre-generate and ship all 81 ending-state lines as static JSON (about 40K tokens, once). Runtime AI only adds one optional flavour line per beat.
- Cache by hash of the state band. Per-room and global daily caps: a circuit breaker stops live calls at about 150K tokens/day.
- Calls go through a Supabase Edge Function proxy. Keys never reach the browser. Always fall back to static text.
- On-device LLMs are too heavy for phones in a 7-minute game. Skip.

### 10.4 Developer token budget (1M/day)
Agentic coding re-reads context each turn, so the 1M can disappear fast. Use repo maps, ask for diffs, keep files small, start fresh sessions, use Codestral for routine edits, and check `/v1/usage` before long runs.

---

## 11. Technical preferences (surface level; implementation decisions are Claude Code's)

- **Language:** TypeScript.
- **Build:** Vite.
- **3D:** plain Three.js (about r186, `three@0.186.0` at time of research; confirm at install). Use `WebGLRenderer` for maximum phone compatibility. No post-processing. Fog, vertex colours and a gradient sky instead. Use instancing for trees, boats and mangroves. Compress GLTF (meshopt or Draco). Avoid React Three Fiber and Babylon for this project.
- **UI:** vanilla DOM + CSS (or a very small framework if truly needed). Glass overlays in CSS (`backdrop-filter` with a solid fallback). Animate with CSS or GSAP.
- **Audio:** Howler.js. Unlock audio on the first user tap. Ambient loop plus short SFX.
- **State:** a small store; the simulation is separate and pure.
- **Testing:** Vitest for the simulation, seeded RNG (mulberry32).
- **Backend:** Supabase (Realtime Broadcast + Presence, Postgres for role claims, Edge Functions for AI proxy).
- **Hosting:** a static host (Netlify, Vercel or Cloudflare Pages), deployed from GitHub. Not verified; choose one and confirm its free limits.
- **PWA / offline:** nice to have, later.
- **Performance targets (**[TUNE]**, not verified facts):** smooth 30+ fps on a mid-range phone, small initial load, lazy-load non-essential assets, show a loading bar.
- **Accessibility:** readable contrast, tap targets, reduced-motion toggle, captions for narration, sound toggle.
- **Privacy:** no analytics, no personal data stored. Anonymous ids only.
- **Env:** `.env.local` for dev only, secrets in Supabase.

### Suggested repo layout
```
/
  CLAUDE.md                  // short: points to docs/GAME_PLAN.md and the working agreement
  docs/GAME_PLAN.md          // this file
  src/
    sim/                     // PURE: types, rng, simulate, pressure, scoring, bots, endings
      roles/*.json           // role configs
    data/                    // facts.json, narration.en.json, narration.ml.json
    scene/                   // coast, sea, sky, morph, camera, props
    ui/                      // screens, panels, widgets (slider, split, placement, haul, cardDraft)
    net/                     // room, presence, roleClaim (flagged)
    audio/
    ai/                      // narrator client (flagged)
    main.ts
  supabase/functions/narrate/
  tests/
  public/assets/             // models, audio, fonts with LICENSES.md
```

---

## 12. Assets, audio and art (verify every licence before shipping)

- **3D (low-poly, CC0 preferred):** Kenney, Quaternius, KayKit (CC0 packs for boats, houses, palm trees, shacks, people). Poly Pizza models vary per model (CC0 or CC-BY with credit). Keep a `LICENSES.md`.
- **Fonts:** serif families from Google Fonts (SIL OFL), such as Fraunces, Playfair Display, Cormorant Garamond, Newsreader or Source Serif 4. See section 7.2 for how to choose.
- **UI icons:** thin-line open icon sets (for example Lucide); **[VERIFY]** the licence. Skip chunky game UI kits, since they clash with the minimal glass style.
- **Audio:** Kenney audio (CC0). Freesound licences vary per file (CC0 or CC-BY fine, avoid CC-BY-NC). Pixabay has its own licence. Sea waves, gulls, wind, UI taps.
- **Art:** generate icons or textures with a free image model if desired, then check the output terms. Fix a palette and prompt template for consistency.
- **Spend effort on:** camera, lighting, the time-jump transition and UI polish. Not on custom character animation.

---

## 13. Milestones (each one must be deployable and enjoyable)

Time targets assume a start in the afternoon of 4 Oct 2026 with the jam ending at 18:00. If the schedule slips, **cut realtime and AI, never polish.** A polished M2 beats a broken M4.

### M0: First impression (scaffold + backdrop)
- **Build:** Vite + TS project, deployed from GitHub. Title screen, loading bar, a 3D coast with animated sea, shore, sky, fog, camera pan with inertia, ambient audio after first tap.
- **Acceptance:** opens fast on a phone, looks good, sound toggles, deployed link works.
- **Gate:** deploy an empty-but-pretty scene early to prove hosting.

### M1: Decision toy (all roles, bots, no sim depth)
- **Build:** glass markers on 5 roles, glass panels (fade or slide in) with the reusable widgets, bots decide for everyone, lock-in flow, round timer.
- **Acceptance:** a full Act 1 can be played start to finish; the UI feels fluid and polished (smooth number transitions, subtle sounds, calm animations).

### M2: Complete short game (the real submission floor)
- **Build:** `simulate()` with the damage model, four meters, one time jump (2026 to 2050) with scene morphing, REAL DATA and SIMULATION overlays, ending screen with each role's private score and a final line. Vitest suite from section 5.3.
- **Acceptance:** a stranger can play a full 4 to 5 minute run and understand it without help. All overlay numbers come from `facts.json`.
- **Gate:** if M2 is not fun by about 3:30 PM, stop adding features and polish this.

### M3: Full arc
- **Build:** second jump (2100), Act 2 path-dependent options, private scores with exposure, both mini-interactions (haul and mangrove placement), the seawall downdrift rule (optionally 6 stretches), all 81 endings.
- **Acceptance:** a complete 7-minute run with a strong ending.

### M4: Multiplayer
- **Build:** share-link rooms, role claiming (race-safe), presence, host election, reconnect, bot takeover, fallback to solo.
- **Acceptance:** two browser tabs can play one room; closing one hands its role to a bot without breaking the run.

### M5: Narrator, music, polish, progression
- **Build:** narrator via Edge Function with caching and fallback, music, extra polish, optional Act 3 action, a replay loop with variations, Malayalam lines (human-translated).
- **Acceptance:** AI off still feels complete; AI on adds flavour only.

### Beyond the jam
More roles, more districts of the Kerala coast, a facts explorer page, teacher/workshop mode, Malayalam UI, and a public write-up on binzek.

---

## 14. Risks and open questions

1. **Submission format and judging criteria** for the jam are unknown. Ask the organisers (link, repo, recording?).
2. **Scope risk.** The idea is ambitious for a first game. Mitigate with the milestone gates above.
3. **Free-tier surprises.** Supabase pauses after a week idle; Gemini and xKiro limits can change. Keep fallbacks.
4. **Fact gaps** (see section 8): SSP1-2.6 and SSP5-8.5 sea-level values for Kozhikode and Kochi, Kerala 2100 temperature, FSI mangrove area, seawall cost per km, household and cooling data, trawl-ban effectiveness, 2019 floods and Wayanad.
5. **Conflicting figures:** erosion share (41% vs 46% vs 60%); Kochi sea-level trend (1.58 vs 1.91 vs 4.14 mm/yr depending on period). Show ranges.
6. **CSTEP's 75 cm for 2100** may be higher than an IPCC median; cross-check with the NASA tool.
7. **Role mechanics are hypotheses.** No postmortems of similar games were reviewed; playtest early with real people.
8. **Narration voice and Malayalam** must be authored by Wajid and a native speaker, not generated.
9. **Name check.** "Longshore" is chosen. It is also a real coastal term (longshore drift), so before launch check availability on itch.io, Steam, Google, a domain, and an @handle to use alongside binzek. The Malayalam edition may use "Kadalkara" as its name (spelling to be confirmed by Wajid).

---

## 15. First prompt to give Claude Code (M0)

> Read `docs/GAME_PLAN.md` fully. Follow the working agreement in section 0. Start Milestone M0: set up a Vite + TypeScript project with plain Three.js (WebGLRenderer), a title screen with a loading bar, a stylised low-poly coast with an animated sea, shore, gradient sky and fog, camera panning with inertia inside bounds, and ambient audio that starts on the first tap. Keep the code modular, with `src/sim` untouched except for empty stubs. Deploy a preview from GitHub. Tell me what you chose and why, and list anything in the plan you would change before M1.
