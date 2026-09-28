#!/usr/bin/env bash
# Run the pgTAP tests in supabase/tests/database against the local database
# with plain psql (no extra Docker image needed). Exits non-zero on failure.
set -euo pipefail

DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
status=0

for file in "$(dirname "$0")"/../supabase/tests/database/*.sql; do
  echo "# $(basename "$file")"
  output="$(psql "$DB_URL" -X -q -t -A -v ON_ERROR_STOP=1 -f "$file" 2>&1)" || status=1
  echo "$output" | grep -E '^(ok|not ok|#|1\.\.)|ERROR' || true
  if echo "$output" | grep -qE '^not ok|ERROR|Looks like you'; then
    status=1
  fi
done

if [ "$status" -ne 0 ]; then
  echo "Database tests FAILED"
else
  echo "Database tests passed"
fi
exit "$status"
