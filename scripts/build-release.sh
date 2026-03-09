#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$ROOT_DIR/src"
OUT_DIR="$ROOT_DIR/extension"

if [[ ! -f "$SRC_DIR/manifest.json" ]]; then
  echo "Missing manifest: $SRC_DIR/manifest.json" >&2
  exit 1
fi

VERSION="$(node -e "const fs=require('fs'); const m=JSON.parse(fs.readFileSync('$SRC_DIR/manifest.json','utf8')); process.stdout.write(m.version)")"
BASENAME="${RELEASE_BASENAME:-pk-chrome-shortcuts}"
ZIP_FILE="$OUT_DIR/${BASENAME}-${VERSION}.zip"

mkdir -p "$OUT_DIR"

package_entries=()
while IFS= read -r line; do
  package_entries+=("$line")
done < <(
  node - "$SRC_DIR/manifest.json" <<'NODE'
const fs = require('fs');
const manifestPath = process.argv[2];
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const entries = new Set(['manifest.json']);

const add = (value) => {
  if (typeof value === 'string' && value.trim()) {
    entries.add(value.trim());
  }
};

if (manifest.icons) {
  for (const path of Object.values(manifest.icons)) add(path);
}

if (manifest.background?.service_worker) add(manifest.background.service_worker);
if (manifest.background?.scripts) {
  for (const path of manifest.background.scripts) add(path);
}

for (const cs of manifest.content_scripts || []) {
  for (const js of cs.js || []) add(js);
  for (const css of cs.css || []) add(css);
}

if (manifest.action?.default_popup) add(manifest.action.default_popup);
if (manifest.action?.default_icon) {
  if (typeof manifest.action.default_icon === 'string') add(manifest.action.default_icon);
  if (typeof manifest.action.default_icon === 'object') {
    for (const path of Object.values(manifest.action.default_icon)) add(path);
  }
}

if (manifest.options_page) add(manifest.options_page);
if (manifest.options_ui?.page) add(manifest.options_ui.page);

for (const war of manifest.web_accessible_resources || []) {
  for (const resource of war.resources || []) add(resource);
}

if (manifest.default_locale) add('_locales');
console.log([...entries].join('\n'));
NODE
)

cd "$SRC_DIR"
for entry in "${package_entries[@]}"; do
  if [[ "$entry" == *"*"* || "$entry" == *"?"* || "$entry" == *"["* ]]; then
    continue
  fi
  if [[ ! -e "$entry" ]]; then
    echo "Missing package entry referenced by manifest: $entry" >&2
    exit 1
  fi
done

rm -f "$ZIP_FILE"
zip -r -q "$ZIP_FILE" "${package_entries[@]}"

echo "Release created: $ZIP_FILE"
