# Building the Android App (Capacitor)

Everything in this repo's JS/React code is ready. These are the commands
to run **on your own machine** (not in a sandbox) — they need the Android
SDK, which you'll get by installing Android Studio.

## 1. Install Android Studio (free)
Download from https://developer.android.com/studio and run the setup
wizard — it installs the Android SDK, an emulator, and everything else
needed. This step alone can take 20–40 minutes depending on your connection.

## 2. Install project dependencies
```
npm install
```

## 3. Add the Android platform
Run this once, from the project root:
```
npx cap init "Still Focus" "com.stillfocus.app" --web-dir=dist
npx cap add android
```
(`capacitor.config.json` already exists with these values — `cap init` may
tell you it's already configured, which is fine, skip to `cap add android`.)

This creates an `android/` folder — a full native Android Studio project.
Do not hand-edit generated files inside `android/` unless you know Android
— treat it as build output, similar to `dist/`.

## 4. Build your web app and sync it into the native project
Every time you change code in `src/`, repeat this:
```
npm run build
npx cap sync android
```
Or just run `npm run android` — it does both plus opens Android Studio.

## 5. Open in Android Studio and run
```
npx cap open android
```
- Plug your Android phone into your computer via USB.
- On your phone: Settings → About phone → tap "Build number" 7 times to
  unlock Developer Options → enable "USB debugging".
- In Android Studio, select your device from the dropdown at the top and
  click the green Run ▶ button.
- First build can take a few minutes (Gradle downloads dependencies).

The app installs and opens on your phone like any other app.

## 6. Notification permission
On Android 13+, the app must ask for notification permission at runtime —
this repo already calls `initNotifications()` on load, which requests it.
Accept the prompt the first time you open the app so session-end alerts
can fire.

## 7. Install a signed APK permanently (no cable needed after this)
In Android Studio: **Build → Generate Signed Bundle / APK → APK** →
create a new keystore (just for you, keep the password somewhere safe) →
build. You get a `.apk` file you can copy to your phone (e.g. via Google
Drive) and install directly — no Play Store, no fee, no review.

## What's already wired up for background reliability
- `src/lib/timerEngine.js` — stores the timer's real end-timestamp, so
  when you reopen the app it recalculates the correct remaining time
  instead of trusting a paused JS interval.
- `src/lib/notifications.js` — schedules a local notification for the
  exact moment a session should end, so you get alerted even if Android
  fully closes the app in the background.
- These only activate inside the Android build (`window.Capacitor`
  present); your Vercel web deployment is unaffected and keeps working
  exactly as before.

## Optional: keep a visible "session running" notification
`@anuradev/capacitor-background-mode` is already in `package.json` if you
want a persistent notification while a session is active (reduces the
chance Android throttles the tab mid-session). It needs a few lines
wiring it into `startPause()` similar to the notification calls already
there — ask if you want this written in too.
