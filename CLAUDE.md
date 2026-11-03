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
                index (home), onboarding, targets, plan
src/domain/     Pure TypeScript, no React or storage imports, so it's trivially unit-testable:
  safety.ts       ALL coach safety limits (calorie floor, max loss/gain, 18+, GP/physio notes,
                  checkTargets for manual edits). Change limits here only.
  targets.ts      Mifflin-St Jeor -> maintenance -> goal adjustment -> macros, with explanations
  exercises.ts    Built-in exercise library (pattern, kit, joints stressed)
  plan.ts         Starting plan generator (split by days/week, injuries, equipment), swaps
  coach.ts        CoachProvider interface + RuleBasedCoach; DailyTargets and CoachEvent types
  onboarding.ts   Questionnaire answers, per-step validation, -> profile/goal records
  profile.ts      Profile/Goal types and display labels
  units.ts, dates.ts, format.ts   helpers
src/data/       KeyValueStore -> Repository<T> -> DataLayer, plus DataProvider (useData/useCoach).
  coachWorkflow.ts  Coach + storage: onboarding, accept/edit targets, accept/edit/reject plan,
                    coach_events logging. The "never change without approval" rule lives here.
src/services/   External APIs (Open Food Facts client - from Phase 2).
src/ui/         Shared components (Screen, Button, Card, Notice, Choice, TextField, NumberField,
                WeightField, Stepper, MacroSummary) and theme tokens.
```

Tests live next to the code as `*.test.ts`. Import alias `@/` = `src/`.

## Data model (collections)

`settings`, `profiles` (one per user), `goals` (one `active`), `daily_targets`
(`proposed` | `active` | `superseded` | `rejected`; `source` coach/manual; stores the
safety context so edits can be re-checked), `training_plans` (days = workout templates;
`proposed` | `active` | `rejected` | `superseded`), `coach_events` (type, provider,
subjectId, summary, decision `pending` | `accepted` | `edited` | `rejected` | `superseded`).
The built-in exercise library is code (`exercises.ts`), not stored; custom exercises come in Phase 3.

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
- The coach only proposes. Workflows in `coachWorkflow.ts` activate things on accept/edit and
  log every proposal + decision. Every provider proposal is also run through `checkTargets`,
  so a future AI provider can't bypass safety limits.
- Coach methods return Promises (so an AI/server provider fits the same interface).
- Swap the coach in one place: `DataProvider.tsx`.
- Number inputs: use `NumberField` / `WeightField` (they keep typed text, report numbers / kg).
- RN 0.88: ScrollView refs are typed `ScrollViewInstance`.

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

## Decisions agreed

- AsyncStorage over expo-sqlite for now (sqlite web support is experimental and
  needs special headers). Can swap behind the repository interface later.
- Ask date of birth (month/year) rather than age.
- Calorie floor 1,200 (female formula) / 1,500 (male) / 1,350 (average); max loss 1% BW/week
  (blocks), planned gain capped at 0.5% BW/week (coach caps; manual edits only warn).
- Sex "other": user picks male/female formula or the average (default average).
- Health question (medical condition / pregnant / breastfeeding): coach sets no deficit and
  points to GP; manual deficits allowed with a warning.
- Injuries: tick-boxes per body area drive exercise swaps; free-text note only triggers the
  physio message.
- Fat-loss default 0.5% BW/week; muscle gain default 0.25%/week; recomp 10% deficit;
  strength/maintain/general fitness at maintenance. Protein 1.6–2.0 g/kg by goal, based on
  the weight at BMI 27 if heavier. Fat ≥ 25% kcal and ≥ 0.6 g/kg; carbs fill the rest.
- Home equipment = dumbbells, a bench and a pull-up bar.
- Open Food Facts (Phase 2): search on button press (rate limit ~10/min); browsers can't
  set User-Agent, so identify the app via an allowed header on web.
- Charts (Phase 3): likely `react-native-gifted-charts`; confirm before adding.

## Status

**Current phase: 1 (Onboarding, targets, starting plan) - built, PR open, awaiting user
confirmation on laptop.** Phase 0 confirmed and merged.

Phase 1 done:
- Onboarding questionnaire (4 steps), 18+ check, health question, redo with pre-fill.
- Target calculation with explanations; safety module; manual edit with live checks.
- Plan generator (full body / upper-lower / PPL+UL / PPL), injuries and equipment aware.
- CoachProvider + RuleBasedCoach; approval workflow; coach_events log.
- Screens: home, onboarding, targets, plan. Unit tests for all logic (92 tests).

Not in Phase 1 (by design): editing the *active* plan (redo onboarding for a new one),
rejecting targets (edit instead).

Next (Phase 2): food logging - Open Food Facts search + barcode number lookup (mocked in
tests), manual/custom foods and meals, recents/favourites, Today screen vs targets, copy
yesterday, edit/delete entries, attribution.
