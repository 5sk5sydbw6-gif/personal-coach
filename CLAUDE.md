# Personal Coach

Diet + training tracker with a built-in rule-based coach. Personal use first,
structured to become multi-user later. Owner is learning app development:
explain key decisions briefly, keep things simple.

See `AGENTS.md` for Expo-specific guidance (Expo changes fast; check the
versioned docs, don't trust memory).

## Hard rules

- **Zero cost.** No dependency that needs payment, an account or an API key.
- Add Expo packages with `npx expo install <pkg>` (in cloud sessions prefix
  with `EXPO_OFFLINE=1`, because the proxy blocks Expo's version API; offline
  mode uses the SDK's bundled version list, so versions stay compatible).
- No native-only libraries before Phase 5; isolate any behind a platform check.
- Unit tests for all calculation and coaching logic. Tests never use the
  network (mock Open Food Facts).
- The coach never changes targets/plans without user approval; every
  suggestion and decision is logged in `coach_events`.
- Coach safety limits (calorie floor, max ~1%/week loss) are enforced in
  code, including on manual edits. 18+ only. No medical advice.
- Work in phases; don't start the next until the user confirms. End each
  phase with a PR into `main`. Commit after each working step.
- Fresh cloud session: run `npm install` first.

## Stack

- Expo SDK 58 (React Native 0.88, React 19.3), TypeScript (strict), Expo Router.
- Runs as a web app in the laptop browser for Phases 0–4; Expo Go on iPhone in Phase 5.
- Storage: `@react-native-async-storage/async-storage` (localStorage on web,
  native storage on iOS), behind the repository interface in `src/data/`.
- Tests: Jest via `jest-expo`.
- Web output: `single` (SPA) in `app.json`.

## Folder structure

```
src/app/        Expo Router routes (screens). Thin: layout + wiring only.
src/domain/     Pure TypeScript: record types, calculations, coach engine.
                No React or storage imports, so it's trivially unit-testable.
src/data/       KeyValueStore -> Repository<T> -> DataLayer, plus DataProvider/useData().
src/services/   External APIs (Open Food Facts client - from Phase 2).
src/ui/         Shared components (Screen = phone-width column) and theme tokens.
```

Tests live next to the code as `*.test.ts`. Import alias `@/` = `src/`.

## Conventions

- Every stored record extends `BaseRecord`: `id` (UUID), `userId`,
  `createdAt`, `updatedAt`, optional `deletedAt` (soft delete, for future sync).
- Single local user: `LOCAL_USER_ID` in `src/data/dataLayer.ts`.
- Store metric only (kg, cm, kcal); convert to lb / st+lb at display time
  (`src/domain/units.ts`).
- Each collection is one JSON array under key `pc:v1:<collection>`.
  Bump `STORAGE_VERSION` and add a migration if the stored shape changes.
- New collection = add a type in `src/domain`, add a repository to
  `DataLayer` in `src/data/dataLayer.ts`.
- Screens get data only via `useData()`; never import AsyncStorage in screens.
- Colours/spacing come from `src/ui/theme.ts`. Wrap screens in `<Screen>`.
- Planned date convention for logs: local calendar date `YYYY-MM-DD` plus a UTC timestamp.

## Commands

```bash
npm install            # install dependencies
npm run web            # dev server, opens in browser (npx expo start --web)
npm test               # unit tests
npm run typecheck      # tsc --noEmit
npm run build:web      # npx expo export --platform web (proves it compiles)
```

Before handing over a phase: `npm test`, `npm run typecheck`, `npm run build:web`,
then give the user numbered macOS steps to try it.

## User setup

macOS laptop, gets code via GitHub Desktop. Repo: `5sk5sydbw6-gif/personal-coach`.

## Decisions agreed / proposed

- AsyncStorage over expo-sqlite for now (sqlite web support is experimental and
  needs special headers). Can swap behind the repository interface later.
- Ask date of birth (month/year) rather than age.
- Calorie floor 1,200 (female formula) / 1,500 (male formula); max loss ~1% BW/week;
  max gain ~0.5% BW/week. For sex "other", ask which formula or average the two.
- Open Food Facts: search on button press (rate limit ~10/min); browsers can't
  set User-Agent, so identify the app via an allowed header on web.
- Charts (Phase 3): likely `react-native-gifted-charts`; confirm before adding.

## Status

**Current phase: 0 (Setup) - built, awaiting user confirmation on laptop.**

Phase 0 done:
- Expo app (TypeScript, Expo Router), trimmed of template examples.
- Data layer: KeyValueStore (AsyncStorage + in-memory), generic
  collection Repository with soft delete and per-user scoping, Settings record.
- Units: kg / lb / st+lb conversion and formatting.
- Home screen placeholder with a persisted weight-unit toggle.
- Jest set up; tests for units and repository.

Next (Phase 1): onboarding questionnaire, target calculation (Mifflin-St Jeor),
starting training plan, CoachProvider interface, coach_events.
