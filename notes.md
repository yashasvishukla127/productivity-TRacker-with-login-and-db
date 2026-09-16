# ============================================================
# ANDROID BUILD — QUICK CHEAT SHEET
# Project: ProductivityApp
# Use this whenever you open a NEW PowerShell terminal
# ============================================================

# 1. Go to Android project
cd "D:\ai engineering\Agentic_ai_architect_journey\ProductivityApp- db\android"


# 2. Set JDK 21
$env:JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
$env:Path="$env:JAVA_HOME\bin;$env:Path"


# 3. Verify Java
java -version

# Expected:
# openjdk version "21.0.12.1"


# 4. Verify Gradle is using JDK 21
.\gradlew -version

# Expected:
# Launcher JVM: 21.0.12...
# Daemon JVM: ...jdk-21.0.12.101-hotspot


# 5. Clean previous Android build files
.\gradlew clean


# 6. Build a fresh Debug APK
.\gradlew assembleDebug


# 7. If you see:
# BUILD SUCCESSFUL
# --------------------------------
# The Android build is successful.
#
# Then open Android Studio:
#   File → Sync Project with Gradle Files
#   Green ▶ Run
#
# ============================================================
# IMPORTANT:
# If Gradle says:
#   "This build uses a Java 8 JVM"
#
# Run steps 2 → 4 again.
#
# If Gradle says:
#   "invalid source release: 21"
#
# Make sure BOTH java -version and
# .\gradlew -version show Java 21.
#
# ============================================================
# KNOWN WORKING SETUP:
#
# Gradle:          8.14.3
# Android Gradle:  8.13.0
# JDK:             21.0.12
#
# ============================================================


# ============================================================
# PRODUCTIVITY APP — ANDROID LATEST BUILD CHECKLIST
# ============================================================
# Use this whenever:
# "Latest deployment/Vercel has new features,
#  but Android app is showing an older version."
# ============================================================

# 1. GO TO PROJECT ROOT
cd "D:\ai engineering\Agentic_ai_architect_journey\ProductivityApp- db"

# 2. CHECK CURRENT GIT VERSION
git status
git log -1 --oneline

# If you need the latest GitHub changes:
git pull



# 3. BUILD THE LATEST WEB VERSION
npm run build
Get-ChildItem .\dist -Recurse -File |
Sort-Object LastWriteTime -Descending |
Select-Object -First 5 Name,LastWriteTime
npx cap sync android
Get-ChildItem .\android\app\src\main\assets\public -Recurse -File |
Sort-Object LastWriteTime -Descending |
Select-Object -First 5 Name,LastWriteTime
Get-ChildItem .\dist\assets\index-*.js |
Select-Object Name,Length
Get-ChildItem .\android\app\src\main\assets\public\assets\index-*.js |
Select-Object Name,Length

cd android
.\gradlew.bat clean
.\gradlew.bat assembleDebug
.\gradlew.bat clean
.\gradlew.bat assembleDebug


# IMPORTANT:
# The Android index-*.js should have the SAME filename and
# SAME size as the current dist index-*.js.
#
# Example:
# dist:    index-sUIbLD-I.js  877264
# Android: index-sUIbLD-I.js  877264
#
# If they don't match:
# STOP — do NOT build the APK.
# Run:
#     npm run build
#     npx cap sync android
# and check again.

# 9. ENTER ANDROID PROJECT
cd android
.\gradlew.bat clean
.\gradlew.bat assembleDebug
# 10. CLEAN OLD GRADLE BUILD
.\gradlew.bat clean

# 11. BUILD FRESH DEBUG APK
.\gradlew.bat assembleDebug

# 12. APK LOCATION
# android\app\build\outputs\apk\debug\app-debug.apk

# 13. INSTALL THE NEW APK ON YOUR PHONE
# If the phone still appears to show the old version:
# uninstall the old Productivity App first,
# then install the newly generated app-debug.apk.

# ============================================================
# FINAL FLOW TO REMEMBER
#
# SOURCE
#   ↓
# npm run build
#   ↓
# dist
#   ↓
# npx cap sync android
#   ↓
# android/app/src/main/assets/public
#   ↓
# gradlew clean
#   ↓
# gradlew assembleDebug
#   ↓
# NEW APK
# ============================================================