#!/bin/bash
# Applies supabase/schema.sql via Safari SQL Editor.
# Needs once: Safari → Settings → Developer → Allow JavaScript from Apple Events
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCHEMA="$ROOT/supabase/schema.sql"
URL="https://supabase.com/dashboard/project/miutizhpylflhahfrucj/sql/new"
TMP_JS="$(mktemp /tmp/vitrin-schema.XXXXXX.js)"

cleanup() { rm -f "$TMP_JS"; }
trap cleanup EXIT

pbcopy < "$SCHEMA"
open -a Safari "$URL"

osascript <<'APPLESCRIPT'
display dialog "در Safari این گزینه‌ها را یک‌بار روشن کن:

1) Settings → Advanced → Show features for web developers
2) Settings → Developer → Allow JavaScript from Apple Events

سپس Continue را بزن." buttons {"Continue"} default button 1 with title "Vitrin → Supabase"
APPLESCRIPT

JS_OK=0
for _ in $(seq 1 12); do
  if osascript -e 'tell application "Safari" to do JavaScript "true" in document 1' >/dev/null 2>&1; then
    JS_OK=1
    break
  fi
  sleep 2
done

if [[ "$JS_OK" -ne 1 ]]; then
  osascript -e 'display dialog "Allow JavaScript from Apple Events هنوز خاموش است. بعد از روشن کردن دوباره همین فایل را باز کن." buttons {"OK"} with title "Vitrin"'
  exit 1
fi

python3 - "$SCHEMA" "$TMP_JS" <<'PY'
import json, pathlib, sys
sql = pathlib.Path(sys.argv[1]).read_text()
pathlib.Path(sys.argv[2]).write_text(
    f"""
(() => {{
  const sql = {json.dumps(sql)};
  const setSql = () => {{
    if (window.monaco && window.monaco.editor) {{
      const editors = window.monaco.editor.getEditors ? window.monaco.editor.getEditors() : [];
      if (editors && editors.length) {{
        editors[0].setValue(sql);
        return "monaco";
      }}
      const models = window.monaco.editor.getModels ? window.monaco.editor.getModels() : [];
      if (models && models.length) {{
        models[0].setValue(sql);
        return "monaco-model";
      }}
    }}
    const ta = document.querySelector("textarea");
    if (ta) {{
      const desc = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value");
      if (desc && desc.set) desc.set.call(ta, sql);
      else ta.value = sql;
      ta.dispatchEvent(new Event("input", {{ bubbles: true }}));
      return "textarea";
    }}
    const ce = document.querySelector('[contenteditable="true"]');
    if (ce) {{
      ce.textContent = sql;
      return "contenteditable";
    }}
    return null;
  }};

  const where = setSql();
  if (!where) return "NO_EDITOR";

  const buttons = Array.from(document.querySelectorAll("button,[role='button']"));
  const runBtn = buttons.find((b) => /\\brun\\b/i.test((b.innerText || b.textContent || "").trim()));
  if (runBtn) {{
    runBtn.click();
    return where + ":clicked-run";
  }}
  return where + ":no-run-button";
}})()
"""
)
PY

RESULT="$(osascript <<APPLESCRIPT
set jsCode to do shell script "cat " & quoted form of "$TMP_JS"
tell application "Safari"
  activate
  delay 1
  set r to do JavaScript jsCode in document 1
  return r
end tell
APPLESCRIPT
)"

echo "safari_js_result=$RESULT"

cd "$ROOT"
node --env-file=.env.local <<'NODE'
const { createClient } = require("@supabase/supabase-js");
const { execFileSync } = require("node:child_process");
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
(async () => {
  for (let i = 0; i < 20; i++) {
    const { error } = await db.from("workspaces").select("id").limit(1);
    if (!error) {
      console.log("SCHEMA_OK");
      try {
        execFileSync("osascript", [
          "-e",
          'display dialog "اسکیما روی Supabase اعمال شد ✅" buttons {"OK"} with title "Vitrin"',
        ]);
      } catch {}
      process.exit(0);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log("SCHEMA_PENDING");
  try {
    execFileSync("osascript", [
      "-e",
      'display dialog "اگر SQL در ادیتور هست، دکمه Run را بزن. بعد دوباره این اسکریپت را اجرا کن." buttons {"OK"} with title "Vitrin"',
    ]);
  } catch {}
  process.exit(2);
})();
NODE
