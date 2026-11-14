#!/usr/bin/env bash
# End-to-end check of Phase 2 auth + authorisation against a running stack.
# Usage: ADMIN_PASSWORD=... DEMO_PASSWORD=... [BASE=http://localhost:3000] ./scripts/smoke-test.sh
set -u
BASE="${BASE:-http://localhost:3000}"
: "${ADMIN_PASSWORD:?set ADMIN_PASSWORD}" "${DEMO_PASSWORD:?set DEMO_PASSWORD}"
pass=0; fail=0

# $1=cookie jar  $2=method  $3=path  [$4=json body]  -> prints HTTP status
call() {
  local jar="$1" method="$2" path="$3" body="${4:-}" xsrf
  xsrf=$(awk '$6=="XSRF-TOKEN"{print $7}' "$jar" 2>/dev/null | tail -1)
  curl -s -o /dev/null -w '%{http_code}' -b "$jar" -c "$jar" -X "$method" \
    -H 'Content-Type: application/json' -H "X-XSRF-TOKEN: ${xsrf}" \
    ${body:+--data "$body"} "$BASE/api/v1$path"
}
check() { # $1=label $2=expected $3=actual
  if [ "$2" = "$3" ]; then echo "PASS  $1"; pass=$((pass+1)); else echo "FAIL  $1 (expected $2, got $3)"; fail=$((fail+1)); fi
}
login() { # $1=jar $2=user $3=pass
  : > "$1"; call "$1" GET /auth/me >/dev/null
  call "$1" POST /auth/login "{\"username\":\"$2\",\"password\":\"$3\"}"
}

A=$(mktemp); S=$(mktemp); C=$(mktemp); trap 'rm -f "$A" "$S" "$C"' EXIT

check "health is public"                       200 "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/v1/health")"
check "anonymous /auth/me -> 401"              401 "$(call "$(mktemp)" GET /auth/me)"
check "wrong password -> 401"                  401 "$(login "$A" admin 'definitely-wrong-Pass1!')"
check "admin login"                            200 "$(login "$A" admin "$ADMIN_PASSWORD")"
check "admin: list users"                      200 "$(call "$A" GET /admin/users)"
check "admin: audit log"                       200 "$(call "$A" GET /admin/audit-logs)"
check "admin: fineract status (200 up/503 down)" 200 "$(call "$A" GET /fineract/status | sed 's/503/200/')"
check "admin: staff endpoint forbidden"        403 "$(call "$A" GET /staff/customers)"
check "POST without CSRF token -> 403"         403 "$(curl -s -o /dev/null -w '%{http_code}' -b "$A" -X POST -H 'Content-Type: application/json' --data '{}' "$BASE/api/v1/auth/refresh")"

check "bank user login"                        200 "$(login "$S" bank.user1 "$DEMO_PASSWORD")"
check "bank user: admin API forbidden"         403 "$(call "$S" GET /admin/users)"
check "bank user: fineract status forbidden"   403 "$(call "$S" GET /fineract/status)"

check "customer login"                         200 "$(login "$C" customer.alex "$DEMO_PASSWORD")"
check "customer: admin API forbidden"          403 "$(call "$C" GET /admin/users)"
check "customer: staff API forbidden"          403 "$(call "$C" GET /staff/customers)"
check "customer: session refresh"              200 "$(call "$C" POST /auth/refresh)"
check "customer logout"                        204 "$(call "$C" POST /auth/logout)"
check "customer session dead after logout"     401 "$(call "$C" GET /auth/me)"

echo; echo "passed=$pass failed=$fail"; [ "$fail" -eq 0 ]
