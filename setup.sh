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
