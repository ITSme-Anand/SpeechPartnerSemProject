# SpeechPartner — Mobile Frontend

React Native + Expo (TypeScript) frontend for SpeechPartner, built from the
`Grammar Partner Cards` design and the `SpeechPartner-Mobile-Tech-Stack`
doc's Phase 1 recommendation. **This is the frontend only** — the FastAPI
backend described in that doc is a separate, out-of-scope piece of work.
The app runs standalone against local mock data so it can be reviewed and
tested today, and switches to the real backend by changing one env var once
it exists.

## What's implemented

All 11 screens from the design: Onboarding (consent + mic permission) →
Auth (sign up / log in / guest) → Home → Choose Your Practice (spin-the-wheel
or type-your-own) → Duration → Live Session (real microphone recording) →
Processing → Session Feedback → Drill → Session Report → Settings.

Not implemented (explicitly out of scope for a frontend-only pass):
- The FastAPI backend itself, and Apple/Google OAuth (buttons are present but inert — they need native config the backend doesn't gate on).
- Push notifications for "session reminders" (the Settings toggle is UI-only).
- Actually deleting an account / managing recordings (stubbed with an alert — wire to the backend's delete endpoints when they exist).

## Tech stack (matches the tech-stack doc)

React Native + Expo SDK 57 (TypeScript) · React Navigation · Axios · `@supabase/supabase-js` · `expo-audio` for mic record/playback (the tech-stack doc's `expo-audio / expo-av` choice — `expo-av` has no SDK 57 build, so this project uses `expo-audio`) · `expo-secure-store` for token storage · EAS Build for release builds.

> **Expo Go version note:** Expo Go only ever supports one SDK at a time
> (whatever's newest). If `npx expo start` says the project's SDK doesn't
> match your installed Expo Go app, this project targets whatever SDK
> `expo` is pinned to in `package.json` — check that against your Expo Go
> app's version and run `npx expo install expo@<major> --fix` (see below)
> to move the project, or update Expo Go from the App/Play Store to match.

## Project layout

```
App.tsx                     Entry point: font loading, providers, splash screen
src/
  theme/                    Design tokens (colors, type) + font loader
  lib/                      env.ts, supabase.ts, api.ts, secureStorage.ts
  context/AuthContext.tsx   Sign up/in/out, guest mode, consent state
  navigation/                Two-stack router (signed-out vs signed-in)
  screens/                  One file per design screen
  services/                 sessionService.ts (real API) + fixtures/ (mock data)
  components/               PrimaryButton, BloomIcon, ScreenContainer
```

## Safe-coding practices applied

- **No secrets in the repo.** `.env` is gitignored; `.env.example` documents
  every variable. Only `EXPO_PUBLIC_*` vars are used, and only for values
  that are safe to ship inside the app binary (API base URL, Supabase
  project URL + anon key — the anon key is meant to be public; Supabase
  row-level security is the actual access control, not secrecy of that key).
- **`src/lib/env.ts`** fails fast with a clear error if a required var is
  missing when not in mock mode, instead of silently calling an empty URL.
  It also refuses a non-HTTPS API URL in production builds.
- **Tokens never touch plain storage.** Supabase session/refresh tokens are
  persisted via `expo-secure-store` (iOS Keychain / Android Keystore), not
  `AsyncStorage`.
- **No user enumeration.** Sign up/log in return one generic error message
  regardless of which field or reason failed.
- **Input validation** on auth (email format, 8+ char password) runs before
  any network call.
- **401 handling**: an API response with a rejected/expired token triggers
  a local sign-out instead of retrying silently with a dead token.
- **No sensitive logging**: the API client logs only the URL and error
  message in `__DEV__`, never response bodies or tokens.
- **Microphone lifecycle**: `SessionScreen` explicitly requests permission,
  handles denial with a clear path to Settings, and always stops the
  in-progress `expo-audio` recorder on unmount (including when the user
  backs out mid-recording) to avoid leaking the OS audio session.
- **TypeScript `strict` + `noUncheckedIndexedAccess`** across the codebase.

## Setup

Requires Node 18+ and the Expo Go app (iOS/Android) or a simulator.

```bash
cd SpeechPartner-Mobile
npm install
cp .env.example .env   # defaults already run the app fully mocked
npm start
```

Then press `i` (iOS simulator), `a` (Android emulator), or scan the QR code
with Expo Go on a physical device.

### Upgrading the Expo SDK

Expo Go on your phone only supports one SDK version at a time, so if it's
ahead of this project, either update the project (below) or downgrade Expo
Go. To move the project to a newer SDK, e.g. 57:

```bash
npx expo install expo@57 --fix   # bumps expo + all expo-managed packages
npm install                       # if --fix's own install step errors out
npx expo-doctor                   # should report all checks passing
```

`expo install --fix` only touches packages Expo manages (React, React
Native, `expo-*`, and a handful of others) — it won't touch things like
`@react-navigation/*`, `axios`, or `@supabase/supabase-js`; bump those
yourself if needed. Also double check:
- `app.json`'s `plugins` array references config plugins by package name —
  if an SDK bump renames/removes a native module (as `expo-av` → `expo-audio`
  was for this project), update the plugin entry and any JS imports too.
- A brand-new native module `expo install` adds (it will say "Installing
  N SDK compatible native module(s)") may need a peer dependency — run
  `npx expo-doctor` and follow its "Missing peer dependency" advice.
- Verify with `npx tsc --noEmit`, `npm run lint`, and
  `npx expo export --platform ios --output-dir /tmp/x && rm -rf /tmp/x`
  (a real Metro bundle catches anything the type checker can't, like a
  missing babel preset).

## How to test

### 1. Mock mode (default — no backend needed)

`.env.example` ships with `EXPO_PUBLIC_USE_MOCK_DATA=true`. In this mode the
entire app — Home stats, the practice wheel, session feedback, the drill,
and the final report — runs on local fixture data in
`src/services/fixtures/data.ts`. This is the fastest way to review the full
flow end to end:

1. `npm start`, open in Expo Go or a simulator.
2. **Onboarding**: check both consent boxes → tap "Allow microphone &
   continue". On a simulator without mic hardware this may show the OS
   permission prompt; grant it (or on iOS Simulator, permission is granted
   automatically).
3. **Auth**: either fill in any email + 8-character password and tap
   "Create account", or tap "Browse a scenario without an account" at the
   bottom to skip straight in as a guest.
4. **Home**: shows the mocked streak, last score, and garden. Tap "Start a
   Session".
5. **Choose Your Practice**: tap "Spin the wheel" to land on a random
   scenario, or switch to "My own topic" and type something, or tap a
   suggestion chip.
6. **Duration**: pick Quick/Standard/Deep Dive, tap "Start session".
7. **Live Session**: grant microphone access when prompted (required — this
   uses the real device/simulator mic via `expo-audio`). Watch the timer count
   down, or tap "Finish & submit" early.
8. **Processing → Feedback**: auto-advances after the mock "submit" resolves;
   review the corrected sentence and score.
9. Tap **"Fix your top pattern"** → answer the drill (select "went") →
   Continue. Tap **"View full report"** from Feedback to see the Report
   screen (grammar/vocab/pace bars, earned badge, garden).
10. **Settings** (gear icon on Home's avatar): toggle switches, try "Log
    out" (returns to Auth), try "Delete my account" (shows a confirmation —
    intentionally stubbed, see "Not implemented" above).

### 2. Static checks (run these after any code change)

```bash
npm run typecheck   # tsc --noEmit — currently passes with zero errors
npx expo-doctor      # validates Expo/dependency config — currently 17/17
npm run lint         # eslint
```

To verify the whole app still compiles/bundles without starting a
simulator (useful in CI or headless environments):

```bash
npx expo export --platform ios --output-dir /tmp/sp-export && rm -rf /tmp/sp-export
```

### 3. Against the real backend

Once the FastAPI backend from the tech-stack doc is deployed:

1. Set in `.env`:
   ```
   EXPO_PUBLIC_USE_MOCK_DATA=false
   EXPO_PUBLIC_API_BASE_URL=https://your-backend-host
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
2. Restart `npm start` (Expo only reads `EXPO_PUBLIC_*` at bundle time, so a
   running dev server won't pick up `.env` edits without a restart).
3. Confirm the backend's CORS/allowed-origins includes the Expo dev
   client's origin, and that its endpoints match the paths in
   `src/services/sessionService.ts` (`/scenarios`, `/home/summary`,
   `/sessions`, `/sessions/:id/feedback`, `/sessions/:id/drill`,
   `/sessions/:id/report`) — adjust that file if the backend's actual
   OpenAPI schema differs.
4. Re-run the flow in "How to test" above; sign-up/login now creates a real
   Supabase user and session data comes from the live API instead of
   fixtures.

## Known gaps / next steps

- No app icon/splash image assets were added (Expo defaults are used) —
  add real branding assets under `assets/` and reference them in
  `app.json` before an EAS production build.
- Apple/Google sign-in buttons on the Auth screen are visual placeholders;
  wiring them up needs `expo-apple-authentication` / Google OAuth config
  and corresponding Supabase provider setup.
- No automated component/unit tests yet — recommend adding
  `@testing-library/react-native` if this becomes a longer-lived project.
