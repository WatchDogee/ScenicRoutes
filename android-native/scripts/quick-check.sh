#!/bin/bash

# Quick check script (fast validation)
# Usage: ./scripts/quick-check.sh

set -e

cd "$(dirname "$0")/.."

echo "⚡ Running quick checks..."
./gradlew checkFast

echo ""
echo "✅ Quick check completed!"


















