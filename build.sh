#!/bin/bash
# ================================================================
# build.sh — מייצר config.js מ-GAS_URL environment variable
# להרצה מקומית: source .env && ./build.sh
# ================================================================

if [ -z "$GAS_URL" ]; then
  echo "❌ GAS_URL is not set"
  echo "   הרץ: source .env && ./build.sh"
  exit 1
fi

CLEAN_URL=$(printf '%s' "$GAS_URL" | tr -d '\n\r ')

cat > config.js <<EOF
// Auto-generated at build time. DO NOT EDIT MANUALLY.
const API_URL = '${CLEAN_URL}';
EOF

echo "✅ config.js generated"
