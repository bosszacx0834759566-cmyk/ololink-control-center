# OloLink Control Center

PHASE 1 — CORE WORLD & ASSETS

Build the foundation of OloLink as a realistic aerospace mission-control prototype.

- Create synchronized realistic 3D Earth globe + 2D world map.

- Professional dark aerospace-grade UX/UI.

- 3D/2D share the same geographic positions and mission state.

Create lightweight realistic 3D assets:

- 100 LEO satellites: LEO-001–LEO-100

- 50 HAPS: HAPS-001–HAPS-050

- 50 Relay Drones: Drone-001–Drone-050

- 50 Ground Stations: GS-001–GS-050

LEO satellites continuously orbit Earth with realistic orientation.

HAPS operate at ~18–20 km above clouds.

Drones operate below HAPS, ~2–5 km lower.

Ground Stations are positioned ~10–15 km from their relay drones.

Distribute all assets into realistic operational clusters worldwide:

LEO → HAPS → Drone → Ground Station

Add LEFT sidebar:

LEO | HAPS | DRONES | GROUND STATIONS | SEARCH | WORLD VIEW | SETTINGS

WORLD VIEW switches between interactive 3D and 2D.

2D supports smooth mouse pan and wheel zoom.

Prioritize performance, readability, realistic proportions, and clean UX.

Do not add weather or advanced communication effects yet.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/46c82319-75ff-4304-bf46-fb562104c940).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
