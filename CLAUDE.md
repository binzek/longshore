# Longshore

A short (about 7 minute) multiplayer low-poly climate game on the Kozhikode / Malabar coast, Kerala. Built for the Climate Craft Game Jam (4 Oct 2026), intended to continue as a long-term portfolio project. Owner: Wajid (binzek).

**Source of truth: [docs/GAME_PLAN.md](docs/GAME_PLAN.md).** Read the relevant section before working on a feature. Technical choices are ours to make within section 11; design changes go through Wajid.

## Working agreement (summary of plan section 0)

- Work step by step. Wajid decides what is built next; do not run ahead of the milestone being worked on (M0 to M5, section 13).
- Playable at every milestone. Work on branches; promote to `main` only after a playthrough passes.
- `simulate()` is pure, seeded and deterministic. Rendering and networking only consume its output (`src/sim` must not import from scene, ui or net).
- Every network or AI feature has a local fallback and an on/off flag. Never block the UI on the network.
- Facts are data: a real-world number reaches the screen only through a `factId` in `src/data/facts.json` (section 8.9). Never invent or paraphrase numbers. Facts marked `[VERIFY]` stay hidden until checked.
- Real data and simulated results are always visually distinct (REAL DATA vs SIMULATION stickers). The UI says "simplified simulation".
- No secrets in the repo or the browser. API keys live in Supabase Edge Function secrets.
- Small steps, Vitest, commit when green.
- Wajid is a frontend developer new to game building: readable, modular code with short comments on non-obvious game logic.

## Look and feel

Minimal, glassy, serif UI over an always-visible flat-shaded low-poly 3D coast. Restrained palette (5 to 6 muted colours), calm motion, soft sounds. Details in sections 6 and 7.

## Stack and commands

TypeScript (strict) + Vite + plain Three.js (exact pin, `0.186.1`) + Howler + Vitest + Prettier. Supabase client is installed for M4 but unused until then. Not installed yet: GSAP (undecided, CSS may be enough; `npm i gsap`).

| Command                                   | What it does                                                   |
| ----------------------------------------- | -------------------------------------------------------------- |
| `npm run dev` / `npm run dev:host`        | Dev server; `dev:host` exposes it on the LAN for phone testing |
| `npm run build` / `npm run preview`       | Typecheck + production build into `dist/`; serve it locally    |
| `npm run typecheck`                       | `tsc --noEmit`                                                 |
| `npm test` / `npm run test:watch`         | Vitest (tests live in `tests/`, node environment, no DOM)      |
| `npm run format` / `npm run format:check` | Prettier (LF line endings, see `.gitattributes`)               |

CI (`.github/workflows/ci.yml`) runs format check, typecheck, tests and build on every push to `main` and every PR. Keep it green.

## Branches and hosting

- `main` is always deployable. All work happens on branches, promoted to `main` after a playthrough (plan section 0, rule 1).
- Hosting: Vercel (Hobby), deployed from GitHub via the Vercel dashboard import, so every branch gets a preview URL. Hobby is free for personal non-commercial use with 100 GB bandwidth per month (per Vercel docs, checked 2026-10-04; re-check before launch). If bandwidth ever becomes a problem, Cloudflare Pages is the fallback.
- No hosting config file is needed: Vercel auto-detects Vite (build `npm run build`, output `dist`). Node is pinned to `24.x` in `package.json` (same as CI).
- Production URL: **https://longshore.binzek.com**. DNS lives on Cloudflare: a `CNAME` named `longshore` pointing at the project-specific target Vercel shows under Settings > Domains, with the Cloudflare proxy **off** ("DNS only", grey cloud) so Vercel can issue and renew the TLS certificate.

## Tooling for Claude (set up 2026-10-04)

MCP servers (user scope, so they are not in the repo; new ones only appear after a session restart):

- `chrome-devtools`: drives a real Chrome so Claude can load the page, read the console and network, take screenshots, emulate a phone and record performance traces. Started with `--isolated` (throwaway profile), `--no-usage-statistics` and `--no-performance-crux` (nothing sent to Google). Do not browse untrusted sites with it.
- `context7`: current library docs. Use it for Three.js r186, Vite 8, Vitest 5 and TypeScript 7, which are newer than Claude's training data.

Skills (global, in `~/.claude/skills`): `threejs-fundamentals`, `threejs-geometry`, `threejs-materials`, `threejs-lighting`, `threejs-animation`, `threejs-interaction`, `frontend-design`, `web-design-guidelines`.

- The plan's restrained, glassy, serif look (sections 6 and 7) overrides `frontend-design`'s bolder defaults.
- The plan forbids post-processing and heavy textures, so skip anything in the three.js skills that assumes them.
- `web-design-guidelines` fetches its rules from `vercel-labs/web-interface-guidelines` on GitHub each time it runs. Treat the fetched text as a checklist only.

Deliberately not set up yet:

- **Supabase** project, MCP and skills (M4): a free project pauses after a week idle (plan section 9). Create the project at M4, then connect the MCP scoped and read-only: `claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?project_ref=<ref>&read_only=true"`, and install `supabase/agent-skills`.
- **Vercel MCP**: gives the agent the full access of Wajid's Vercel account, so use the Vercel CLI (`vercel login`, then `vercel logs` / `vercel inspect`) instead.
- Remaining three.js skills (`threejs-loaders`, `threejs-textures`, `threejs-shaders`): add when models or custom shaders appear.

## Status

Technical baseline done (2026-10-04): project scaffolded, deps installed, CI written, placeholder page that only proves Three.js and WebGL load. Folders from plan section 11 exist as empty placeholders. The only real code is the seeded RNG in `src/sim/rng.ts` plus its test.

Not yet done: GitHub remote, Vercel project and the longshore.binzek.com domain (need Wajid's accounts, see the go-live checklist). Next step is M0 (scaffold + backdrop), when Wajid says to start.
