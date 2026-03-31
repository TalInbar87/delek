#!/bin/bash
# ================================================================
# deploy.sh — GAS + Git auto-deploy
# ================================================================
# 1. טוען משתנים מ-.env
# 2. מחשב ADMIN_PASSWORD_HASH ומזריק ל-Config.js
# 3. clasp push + עדכון deployment
# 4. מייצר config.js (build.sh)
# 5. git commit & push
# ================================================================

set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GAS_DIR="$REPO_DIR/appScripts/unified"
ENV_FILE="$REPO_DIR/.env"
GAS_CONFIG="$GAS_DIR/Config.js"

# ────────────────────────────────────────────────
# 0. טען .env
# ────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ .env file not found"
  echo "   העתק .env.example ל-.env ומלא את הערכים"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

if [ -z "$GAS_DEPLOYMENT_ID" ] || [ -z "$GAS_URL" ]; then
  echo "❌ GAS_DEPLOYMENT_ID or GAS_URL is not set in .env"
  exit 1
fi

if [ -z "$JWT_SECRET" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo "❌ JWT_SECRET or ADMIN_PASSWORD is not set in .env"
  exit 1
fi

echo "📋 Using deployment: $GAS_DEPLOYMENT_ID"

# ────────────────────────────────────────────────
# 1. חשב ADMIN_PASSWORD_HASH (SHA256 של password+secret, base64)
# ────────────────────────────────────────────────
echo "🔐 Computing admin password hash..."
ADMIN_PASSWORD_HASH=$(python3 - <<PYEOF
import hashlib, base64, os
pw     = os.environ.get('ADMIN_PASSWORD', 'admin123')
secret = os.environ.get('JWT_SECRET', '')
digest = hashlib.sha256((pw + secret).encode('utf-8')).digest()
print(base64.b64encode(digest).decode('utf-8'))
PYEOF
)
echo "   ✅ Hash computed"

# ────────────────────────────────────────────────
# 2. הזרק ערכים ל-Config.js
# ────────────────────────────────────────────────
echo "⚙️  Injecting secrets into Config.js..."
python3 - <<PYEOF
import re, os

with open('$GAS_CONFIG', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r"JWT_SECRET:\s*'[^']*'",          "JWT_SECRET:          '$JWT_SECRET'",          content)
content = re.sub(r"ADMIN_PASSWORD_HASH:\s*'[^']*'",  "ADMIN_PASSWORD_HASH: '$ADMIN_PASSWORD_HASH'", content)

with open('$GAS_CONFIG', 'w', encoding='utf-8') as f:
    f.write(content)
PYEOF
echo "   ✅ Config.js ready"

# ────────────────────────────────────────────────
# 3. clasp push + deploy
# ────────────────────────────────────────────────
echo "📦 Pushing GAS files..."
cd "$GAS_DIR"
clasp push --force

echo "🚀 Deploying new version..."
DEPLOY_OUTPUT=$(clasp deploy -i "$GAS_DEPLOYMENT_ID" -d "auto-deploy $(date '+%Y-%m-%d %H:%M')" 2>&1)
echo "$DEPLOY_OUTPUT"

NEW_ID=$(echo "$DEPLOY_OUTPUT" | grep -oE 'AKfycb[A-Za-z0-9_\-]+' | head -1)

if [ -n "$NEW_ID" ] && [ "$NEW_ID" != "$GAS_DEPLOYMENT_ID" ]; then
  NEW_URL="https://script.google.com/macros/s/$NEW_ID/exec"
  echo "🔄 URL changed → updating .env..."
  sed -i '' "s|GAS_DEPLOYMENT_ID=.*|GAS_DEPLOYMENT_ID=$NEW_ID|" "$ENV_FILE"
  sed -i '' "s|GAS_URL=.*|GAS_URL=$NEW_URL|"                    "$ENV_FILE"
  GAS_URL="$NEW_URL"
  echo "🔗 New URL: $NEW_URL"
else
  echo "✅ Same URL — no update needed"
fi

# ────────────────────────────────────────────────
# 4. צור config.js
# ────────────────────────────────────────────────
echo "⚙️  Generating config.js..."
cd "$REPO_DIR"
bash build.sh

# ────────────────────────────────────────────────
# 5. Git commit & push
# ────────────────────────────────────────────────
cd "$REPO_DIR"

if git diff --quiet && git diff --cached --quiet; then
  echo "✅ Nothing to commit"
else
  echo "📝 Committing..."
  git add index.html admin.html config.js config.example.js
  git commit -m "deploy: update $(date '+%Y-%m-%d %H:%M')"
  git push origin main
  echo "✅ Pushed to main"
fi

echo ""
echo "🎉 Done! URL: $GAS_URL"
