#!/usr/bin/env bash
# Neon 마이그레이션 적용 (Epic5 · tech-design §5) — 버저닝 SQL 실행
# 사용법: PG_DSN="postgres://..." ./scripts/migrate.sh
set -euo pipefail
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -z "${PG_DSN:-}" ]; then
  echo "PG_DSN 환경변수가 필요합니다 (Neon 쓰기 계정)." >&2; exit 1
fi
MIG_DIR="$APP_DIR/loader/migrate"
MARK="schema_migrations"
for f in $(ls "$MIG_DIR"/*.sql | sort); do
  ver="$(basename "$f" .sql)"
  exists=$(psql "$PG_DSN" -tA -c "SELECT 1 FROM $MARK WHERE version='$ver'" 2>/dev/null || echo 0)
  if [ "$exists" = "1" ]; then echo "skip $ver"; continue; fi
  psql "$PG_DSN" -v ON_ERROR_STOP=1 -f "$f"
  psql "$PG_DSN" -c "INSERT INTO $MARK(version) VALUES ('$ver') ON CONFLICT DO NOTHING"
  echo "applied $ver"
done
