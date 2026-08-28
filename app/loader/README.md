# loader — 정제·적재·분석

- 실행(로컬 검증, Sqlite): `python3 run_collection.py`
  → 실제 crawled/ 샘플(위시켓 제외 전체, 429건) 적재 + 분석 재계산 + 수집이력
- 프로덕션(Neon): `PG_DSN=postgres://... python3 run_collection.py` (PostgresAdapter)
- 마이그레이션: `PSQL` 설치 후 `../scripts/migrate.sh`
- 테스트: `python3 -m pytest tests/ -q`
- 크롤러 실행 venv: venv-A(curl_cffi, 위시켓·u300 제외) / venv-B(lzstring, 위시켓·u300)
  → 각 크롤러는 자신의 venv 인터프리터로만 실행(교차 금지, tech-design §1)
