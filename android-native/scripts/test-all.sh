#!/bin/bash

# Bash script for automated testing
# Usage: ./scripts/test-all.sh

set -e

echo "🚀 Starting automated Android tests..."

cd "$(dirname "$0")/.."

echo ""
echo "📝 Formatting code..."
./gradlew ktlintFormat

echo ""
echo "✅ Running unit tests..."
./gradlew testDebugUnitTest

echo ""
echo "📊 Generating coverage report..."
./gradlew jacocoTestReport

echo ""
echo "🔍 Running lint..."
./gradlew lintDebug

echo ""
echo "🎯 Running detekt..."
./gradlew detekt

echo ""
echo "✅ All tests completed!"
echo "📊 Coverage: app/build/reports/jacoco/jacocoTestReport/html/index.html"
echo "📋 Lint: app/build/reports/lint-results-debug.html"
echo "🔍 Detekt: app/build/reports/detekt/detekt.html"


















