# 시장조사·분석 대시보드 — 구현(app/)

- worker/ : Cloudflare Workers API (TS) + Rust(WASM) agg
- web/    : Cloudflare Pages SPA (React+TS+Vite)
- crawler/: Python 크롤러 5종 (venv A=curl_cffi / venv B=lzstring 격리)
- loader/ : 정제·적재 배치 (ETL) + 분석 재계산 + migration SQL

로컬 검증: `cd loader && python3 run_collection.py` (SqliteAdapter, 실제 crawled 샘플 적재)
프로덕션: `PG_DSN=... python3 run_collection.py` → PostgresAdapter(Neon)
