#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/src"
ARTIFACT_DIR="$ROOT_DIR/extension"
cd "$ROOT_DIR"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required env var: $name" >&2
    exit 1
  fi
}

parse_json_field() {
  local field="$1"
  node -e "
let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const value = data['$field'];
    if (value === undefined || value === null || value === '') {
      process.exit(2);
    }
    process.stdout.write(String(value));
  } catch (err) {
    process.exit(3);
  }
});
"
}

require_cmd curl
require_cmd zip
require_cmd node

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Missing source directory: $SOURCE_DIR" >&2
  exit 1
fi

if [[ ! -f "$SOURCE_DIR/manifest.json" ]]; then
  echo "Missing source manifest: $SOURCE_DIR/manifest.json" >&2
  exit 1
fi

if [[ -f secrets/.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source secrets/.env
  set +a
fi

require_var CWS_PUBLISHER_ID
require_var CWS_EXTENSION_ID
require_var CWS_CLIENT_ID
require_var CWS_CLIENT_SECRET
require_var CWS_REFRESH_TOKEN

CWS_PUBLISH_TYPE="${CWS_PUBLISH_TYPE:-DEFAULT_PUBLISH}"
CWS_SKIP_PUBLISH="${CWS_SKIP_PUBLISH:-0}"

EXT_VERSION="$(node -e "const fs=require('fs');const m=JSON.parse(fs.readFileSync('$SOURCE_DIR/manifest.json','utf8'));process.stdout.write(m.version)")"
mkdir -p "$ARTIFACT_DIR"
ZIP_FILE="${CWS_ZIP_FILE:-extension/${CWS_EXTENSION_ID}-${EXT_VERSION}.zip}"
ZIP_FILE_ABS="$ROOT_DIR/$ZIP_FILE"

echo "Building package from $SOURCE_DIR: $ZIP_FILE_ABS"

package_entries=()
while IFS= read -r line; do
  package_entries+=("$line")
done < <(
  node - "$SOURCE_DIR/manifest.json" <<'NODE'
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

cd "$SOURCE_DIR"

for entry in "${package_entries[@]}"; do
  if [[ "$entry" == *"*"* || "$entry" == *"?"* || "$entry" == *"["* ]]; then
    continue
  fi
  if [[ ! -e "$entry" ]]; then
    echo "Missing package entry referenced by manifest: $entry" >&2
    exit 1
  fi
done

rm -f "$ZIP_FILE_ABS"
zip -r -q "$ZIP_FILE_ABS" "${package_entries[@]}"

cd "$ROOT_DIR"

echo "Requesting OAuth access token..."
TOKEN_RESPONSE="$(
  curl -sS "https://oauth2.googleapis.com/token" \
    -d "client_id=$CWS_CLIENT_ID" \
    -d "client_secret=$CWS_CLIENT_SECRET" \
    -d "refresh_token=$CWS_REFRESH_TOKEN" \
    -d "grant_type=refresh_token"
)"

if ! ACCESS_TOKEN="$(printf '%s' "$TOKEN_RESPONSE" | parse_json_field access_token)"; then
  echo "Failed to get access token. OAuth response:" >&2
  echo "$TOKEN_RESPONSE" >&2
  exit 1
fi

UPLOAD_URL="https://chromewebstore.googleapis.com/upload/v2/publishers/${CWS_PUBLISHER_ID}/items/${CWS_EXTENSION_ID}:upload"
echo "Uploading ZIP to Chrome Web Store..."

UPLOAD_RESPONSE="$(
  curl -sS -w $'\n%{http_code}' \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/zip" \
    -X POST \
    -T "$ZIP_FILE_ABS" \
    "$UPLOAD_URL"
)"

UPLOAD_HTTP="${UPLOAD_RESPONSE##*$'\n'}"
UPLOAD_BODY="${UPLOAD_RESPONSE%$'\n'*}"

if [[ ! "$UPLOAD_HTTP" =~ ^2 ]]; then
  echo "Upload failed (HTTP $UPLOAD_HTTP):" >&2
  echo "$UPLOAD_BODY" >&2
  exit 1
fi

echo "Upload OK."
echo "$UPLOAD_BODY"

if [[ "$CWS_SKIP_PUBLISH" == "1" ]]; then
  echo "CWS_SKIP_PUBLISH=1 -> upload only, publish skipped."
  exit 0
fi

PUBLISH_URL="https://chromewebstore.googleapis.com/v2/publishers/${CWS_PUBLISHER_ID}/items/${CWS_EXTENSION_ID}:publish"
PUBLISH_PAYLOAD="{\"publishType\":\"${CWS_PUBLISH_TYPE}\"}"

echo "Publishing item..."
PUBLISH_RESPONSE="$(
  curl -sS -w $'\n%{http_code}' \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -X POST \
    -d "$PUBLISH_PAYLOAD" \
    "$PUBLISH_URL"
)"

PUBLISH_HTTP="${PUBLISH_RESPONSE##*$'\n'}"
PUBLISH_BODY="${PUBLISH_RESPONSE%$'\n'*}"

if [[ ! "$PUBLISH_HTTP" =~ ^2 ]]; then
  echo "Publish failed (HTTP $PUBLISH_HTTP):" >&2
  echo "$PUBLISH_BODY" >&2
  exit 1
fi

echo "Publish OK."
echo "$PUBLISH_BODY"

STATUS_URL="https://chromewebstore.googleapis.com/v2/publishers/${CWS_PUBLISHER_ID}/items/${CWS_EXTENSION_ID}:fetchStatus"
echo "Fetching status..."
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$STATUS_URL"
echo
