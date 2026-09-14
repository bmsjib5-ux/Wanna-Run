# ไปวิ่งไหม — NativeShad design adaptation

## Reference and approach

Reviewed [chvvkrishnakumar/NativeShad](https://github.com/chvvkrishnakumar/NativeShad):

- [README](https://github.com/chvvkrishnakumar/NativeShad/blob/main/README.md): owned, composable UI components and platform-aware interaction.
- [Button](https://github.com/chvvkrishnakumar/NativeShad/blob/main/components/ui/button.tsx): explicit variants and sizes, disabled and pressed states.
- [Card](https://github.com/chvvkrishnakumar/NativeShad/blob/main/components/ui/card.tsx): separate container, header, and content responsibilities.
- [Theme](https://github.com/chvvkrishnakumar/NativeShad/blob/main/components/ui/theme.tsx) and [tokens](https://github.com/chvvkrishnakumar/NativeShad/blob/main/global.css): semantic colors and light/dark support.

NativeShad targets React Native/Expo. This application uses React DOM, Vite, Capacitor, Leaflet and Supabase. The adaptation implements these component patterns in semantic HTML; it does not install Expo or replace the existing native GPS implementation. The user's reference image informs the forest-green/white palette, rounded cards, compact shortcuts, bottom navigation, sign-in hierarchy, achievements, and settings rows.

## Implementation

- `src/components/ui/index.tsx`: Button variants/sizes, Card, CardHeader, CardContent, Input. Native HTML props and accessible names remain available to consumers.
- `src/native-design.css`: semantic aliases over the existing theme tokens, component styling, mobile sizes, visible keyboard focus, reduced-motion behavior and forced-colors fallbacks.
- `src/components/Brand.tsx`: shared Thai wordmark and Lucide icon.
- Home: actual accumulated distance, seven calendar-day totals, weekly target, invitations, friends and streak. An accessible data table accompanies the chart. Empty accounts display invitations to start, not invented activities or scores.
- Authentication: email/password signup and login, password visibility, remembered email and password-reset request. These continue to use `AuthProvider` and Supabase. No social-login buttons are presented without provider support.
- Navigation: home, invitations, run tracking, friends and profile. Maps/groups remain accessible from home; missions/games from home and settings.
- Invitations: image-backed cards with keyboard-accessible title buttons. Existing invitation actions remain in the detail sheet.
- Profile: achievement grid with visible criteria and locked/earned status. The 5K description now accurately describes the existing accumulated-distance condition.
- Settings: account, notifications, location sharing, missions, expandable appearance controls and build information.
- Run tracking: map first, followed by a dark statistics/control panel; existing GPS/simulation/pause/resume/finish behavior retained.
- Sheets: focus enters the dialog, Tab stays inside the topmost dialog, and focus returns to the opener on close.
- Onboarding and installed-web-app metadata use the Thai name. Existing saved theme choices remain respected; new users default to light/mint.
- Browser zoom, copying and text selection are available again.

The photo is the repository's existing `public/hero-run.jpg`. Authentication credentials, token storage, database policies and native permissions were not migrated.

## Verification

- `npm run build`: passed (TypeScript and Vite). Existing bundle-size warning remains.
- `npm run lint`: completes with warnings in existing modules; no lint errors.
- Browser review: home and auth at 390px; home at 320px after fixing the accessible chart table's intrinsic-width overflow. Verified document/client/inner widths all equal 320px.
- Verified invitation creation sheet opens and exposes title/place/date/distance fields. Submitting without friends remains disabled by existing logic.
- Verified signup/login mode switch, required fields, minimum password length and password visibility toggle in an isolated auth-component test page.
- Reviewed light and dark themes. No application console errors observed on the main review page.
- Verified simulated run start, pause, resume, finish and summary dialog in an isolated local account. The summary dialog initially focused its close button.

This checkout has no Supabase credentials. Authentication UI was mounted in an isolated browser test harness, so successful server login, password recovery delivery, remote sync, physical-device GPS and APK behavior have not been end-to-end verified.

## Run locally

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Use `.env.example` for cloud configuration. Without the two Supabase variables, the existing local mode remains available. Review this change through its pull request before production deployment.
