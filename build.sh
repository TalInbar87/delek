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

cat > config.js <<EOF
// ================================================================
// config.js — Auto-generated at build time. DO NOT EDIT MANUALLY.
// ================================================================
const API_URL = '$GAS_URL';
EOF

echo "✅ config.js generated"
