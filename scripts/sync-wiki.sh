#!/usr/bin/env bash
# Sync wiki/ contents to the GitHub wiki repo.
#
# GitHub wikis live in a separate git repo at <repo>.wiki.git that gets
# initialized only after the first page is created via the web UI.
#
# Usage:
#   1. Visit https://github.com/az-civic-tools/sos-mcp/wiki
#   2. Click "Create the first page" — save it with any content (e.g. just "x")
#   3. Run this script: ./scripts/sync-wiki.sh
#   4. The wiki will be replaced with everything from wiki/

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WIKI_SRC="$REPO_ROOT/wiki"
WIKI_REPO_URL="https://github.com/az-civic-tools/sos-mcp.wiki.git"
TMPDIR=$(mktemp -d)

trap "rm -rf $TMPDIR" EXIT

echo "Cloning wiki repo to $TMPDIR..."
if ! git clone "$WIKI_REPO_URL" "$TMPDIR/wiki"; then
  echo
  echo "ERROR: wiki repo doesn't exist yet."
  echo "Visit https://github.com/az-civic-tools/sos-mcp/wiki and click 'Create the first page'."
  echo "Save anything (e.g. just type 'x' and Save). Then re-run this script."
  exit 1
fi

cd "$TMPDIR/wiki"

# Wipe everything except .git, then copy fresh content
echo "Replacing wiki contents from $WIKI_SRC..."
find . -maxdepth 1 ! -name '.git' ! -name '.' -exec rm -rf {} +
cp "$WIKI_SRC"/*.md .

git add -A
if git diff --cached --quiet; then
  echo "No changes to push."
  exit 0
fi

git commit -m "docs: sync wiki from main repo wiki/ folder"
git push origin master 2>/dev/null || git push origin main

echo
echo "Wiki updated: https://github.com/az-civic-tools/sos-mcp/wiki"
