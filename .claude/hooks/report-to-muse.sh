#!/bin/bash
set -u
URL_FILE="$HOME/.claude/muse-bridge-url.txt"
WEBHOOK_URL="${MUSE_BRIDGE_URL:-}"
if [ -z "$WEBHOOK_URL" ] && [ -f "$URL_FILE" ]; then WEBHOOK_URL="$(tr -d '[:space:]' < "$URL_FILE")"; fi
[ -n "$WEBHOOK_URL" ] || exit 0
TITLE=""; TEXT=""
if [ "${1:-}" = "--text" ]; then
  TITLE="${2:-manual report}"; TEXT="${3:-}"
else
  INPUT="$(cat)"
  TRANSCRIPT="$(printf '%s' "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('transcript_path',''))" 2>/dev/null)"
  TITLE="$(printf '%s' "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('cwd','session'))" 2>/dev/null)"
  if [ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ]; then
    TEXT="$(python3 - "$TRANSCRIPT" <<'PYEOF' 2>/dev/null
import json, sys
last = ""
try:
    with open(sys.argv[1], encoding="utf-8", errors="replace") as f:
        for line in f:
            try: obj = json.loads(line)
            except Exception: continue
            if obj.get("type") == "assistant":
                parts = [b.get("text","") for b in ((obj.get("message") or {}).get("content") or [])
                         if isinstance(b, dict) and b.get("type") == "text" and b.get("text")]
                if parts: last = "\n".join(parts)
except Exception: pass
print("\n".join(last.splitlines()[-80:]))
PYEOF
)"
  fi
fi
[ -z "$TEXT" ] && TEXT="(no report text captured)"
TITLE="${TITLE:-Claude report}"
python3 - "$WEBHOOK_URL" "$TITLE" "$TEXT" <<'PYEOF' 2>/dev/null
import json, sys, urllib.request
url, title, text = sys.argv[1], sys.argv[2], sys.argv[3]
payload = json.dumps({"title": title, "text": text[:6000]}).encode("utf-8")
req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
try: urllib.request.urlopen(req, timeout=30).read()
except Exception: pass
PYEOF
exit 0
