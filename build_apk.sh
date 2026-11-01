#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
export JAVA_HOME="$DIR/jdk/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"

echo "Using local JDK: $JAVA_HOME"
"$JAVA_HOME/bin/java" -version

echo "Building web bundle and syncing to Android assets..."
npm run build
npx cap sync android

echo "Compiling Android Debug APK..."
cd "$DIR/android"
./gradlew assembleDebug

echo ""
echo "=========================================================="
echo "✅ APK Build Complete!"
echo "📦 Output APK: android/app/build/outputs/apk/debug/app-debug.apk"
echo "=========================================================="
