#!/bin/bash

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

# Copy commands with {{REPO_ROOT}} replaced by the actual repo path
COMMANDS_SRC="$REPO_DIR/.claude/commands"
COMMANDS_TARGET="$HOME/.claude/commands"
mkdir -p "$COMMANDS_TARGET"

for file in "$COMMANDS_SRC"/*.md; do
  [ -f "$file" ] || continue
  name="$(basename "$file")"
  dest="$COMMANDS_TARGET/$name"
  sed "s|{{REPO_ROOT}}|$REPO_DIR|g" "$file" > "$dest"
  echo "Installed: commands/$name"
done

# Copy skills with {{REPO_ROOT}} replaced by the actual repo path
SKILLS_SRC="$REPO_DIR/.claude/skills"
SKILLS_TARGET="$HOME/.claude/skills"
mkdir -p "$SKILLS_TARGET"

for file in "$SKILLS_SRC"/*.md; do
  [ -f "$file" ] || continue
  name="$(basename "$file")"
  dest="$SKILLS_TARGET/$name"
  sed "s|{{REPO_ROOT}}|$REPO_DIR|g" "$file" > "$dest"
  echo "Installed: skills/$name"
done

# Install npm dependencies for each tool
echo ""
if ! command -v npm &>/dev/null; then
  echo "npm not found. Please install Node.js first:"
  echo "  https://nodejs.org  or  brew install node"
  exit 1
fi

echo "Installing npm dependencies..."
for dir in firebase grafana mongo; do
  if [ -f "$REPO_DIR/$dir/package.json" ]; then
    echo "Running npm install in $dir/..."
    (cd "$REPO_DIR/$dir" && npm install)
  fi
done

# Remind user about required credentials
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Setup complete! Before using the tools, configure:"
echo ""
echo "  grafana/  → copy grafana/.env.template → grafana/.env"
echo "              fill in GRAFANA_URL_DEV/PROD and GRAFANA_TOKEN_DEV/PROD"
echo ""
echo "  mongo/    → copy mongo/.env.template → mongo/.env"
echo "              fill in MONGO_URL_DEV and MONGO_URL_PROD"
echo ""
echo "  firebase/ → add firebaseKey-dev.json and firebaseKey-prod.json"
echo "              (Firebase service account JSON files)"
echo ""
echo "  portal/   → ensure GitHub CLI is installed and authenticated:"
echo "              brew install gh && gh auth login"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
