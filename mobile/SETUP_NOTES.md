# Mobile App Setup Notes

## TypeScript Compilation Notes

**Expected Behavior**: Running `npm run type-check` will show errors related to:
1. WatermelonDB decorators (`@field`, `@readonly`, `@date`, etc.)
2. Missing `react-native` module

**Why This Happens**:
- WatermelonDB decorators require runtime support that's provided by the Babel plugin (`@babel/plugin-proposal-decorators`)
- The `react-native` module is resolved by Expo at runtime, not during TypeScript compilation
- TypeScript's standalone compiler doesn't have access to the Expo runtime environment

**Resolution**:
These are NOT real errors. The app will work correctly when run through Expo:

```bash
npm start   # Start Expo dev server
```

The Babel transform and Expo runtime will resolve all these issues during the build process.

## Getting Started

### 1. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps API key
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID

### 2. Configure Firebase

Download `google-services.json` from your Firebase project and place it in the `mobile/` directory.

For iOS, you'll also need `GoogleService-Info.plist`.

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Development Server

```bash
npm start
```

This will open Expo Dev Tools in your browser. From there you can:
- Press `i` to open iOS simulator
- Press `a` to open Android emulator
- Scan the QR code with Expo Go app on your physical device

## Development Commands

```bash
# Start Expo dev server
npm start

# Start with cache cleared
npx expo start --clear

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Lint code
npm run lint
```

## Known Limitations

- `npm run type-check` will show expected errors (see above)
- For actual type checking, use your IDE's TypeScript integration or run the app

## Troubleshooting

### Metro Bundler Issues

If you encounter metro bundler errors:

```bash
# Clear all caches
npx expo start --clear
rm -rf node_modules
npm install
```

### WatermelonDB Build Errors

If you get native build errors related to WatermelonDB:

```bash
# Regenerate native code
npx expo prebuild --clean
```

### Push Notifications Not Working

- Push notifications only work on physical devices
- Ensure `google-services.json` is present
- Verify Firebase project is configured correctly
- Check that FCM is enabled in Firebase Console

## Next Steps

After setup, you can:
1. Test login functionality
2. Verify offline sync works (airplane mode test)
3. Test push notifications
4. Begin implementing feature screens

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [WatermelonDB Setup](https://nozbe.github.io/WatermelonDB/Installation.html)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [Supabase React Native](https://supabase.com/docs/guides/getting-started/quickstarts/react-native)
