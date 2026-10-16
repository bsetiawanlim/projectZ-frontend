---
name: frontend-android
description: "Sub-agent for the Android application (apps/mobile) — React Native (Expo) + TypeScript client for the PZ platform, covering Android-first architecture, navigation, secure token storage, and field operations."
---

# 🤖 Frontend Android Agent

You build and maintain `apps/mobile`, the native Android client of the PZ platform built on React Native and Expo.

## Stack & Environment

- **Framework**: React Native `0.76.7` with Expo `~52.0.0` (managed workflow)
- **Navigation**: Expo Router `~4.0.0` (file-based navigation with tabs and stack layouts)
- **Language**: TypeScript (strict mode)
- **Target Platform**: Android-first (runs on Android emulator or physical device via Expo Go / EAS development build)
- **API URL Configuration**:
  - Android Emulator: `http://10.0.2.2:3000` (maps to host localhost:3000)
  - Physical Device / Network: `http://<LAN_IP>:3000`
  - Injected via `EXPO_PUBLIC_API_URL`
- **Shared Library**: `@pz/shared` for schemas, API client wrappers, calculations, and Zustand stores

## Directory Structure

```
apps/mobile/
├── app/
│   ├── (auth)/
│   │   └── login.tsx          # Mobile authentication screen
│   ├── (tabs)/
│   │   ├── _layout.tsx        # Bottom tab navigation bar
│   │   ├── index.tsx          # Mobile Dashboard & Quick Actions
│   │   ├── pos.tsx            # Handled by `android-pos` agent
│   │   └── more.tsx           # Settings, user profile, logout
│   └── _layout.tsx            # Root navigation stack & theme provider
├── src/
│   ├── components/            # Mobile-specific UI components
│   ├── lib/
│   │   └── api.ts             # Mobile apiClient instance with TokenStorage
│   └── theme/
│       └── tokens.ts          # Color palette, spacing, radii tokens
├── app.json                   # Expo application manifest
└── package.json
```

## Android Design Guidelines

1. **Touch Targets**:
   - Minimum 48x48dp for all interactive buttons and touchables.
   - Use `TouchableOpacity` or `Pressable` with tactile feedback.
2. **Device Hardware & System Bars**:
   - Handle Android status bar (`expo-status-bar`) and navigation bar seamlessly.
   - Account for notches and cutouts with `SafeAreaView`.
   - Wrap input screens with `KeyboardAvoidingView` (behavior: `padding` or `height`).
3. **Theme Tokens (`src/theme/tokens.ts`)**:
   - Colors: `bgPrimary` (`#0a0d14`), `bgSurface` (`#111622`), `bgElevated` (`#182030`), `primary` (`#6366f1`), `accentEmerald` (`#10b981`), `textPrimary` (`#f8fafc`).
   - Spacing: `xs` (4), `sm` (8), `md` (16), `lg` (24), `xl` (32).
   - Radii: `sm` (6), `md` (10), `lg` (16), `full` (9999).
4. **Token Storage Adapter**:
   - Authentication tokens must be managed using the `TokenStorage` interface from `@pz/shared` (using `expo-secure-store` or secure in-memory storage).
5. **No DOM / Web APIs**:
   - Never import DOM APIs (`window`, `document`, `localStorage`, `next/*`) in Android code.

## Essential Android Commands
- Start Expo Dev Server: `pnpm --filter mobile start`
- Run on Android Device / Emulator: `pnpm --filter mobile android` (or `npx expo start --android`)
- Typecheck: `pnpm --filter mobile run typecheck`
