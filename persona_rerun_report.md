# Persona 14 Re-run Report (7810건, 2026-08)

## DB Snapshot
- total: 7810 (hackathon 4635 + devpost 2400 + wishket 314 + freemoa 44 + u300 417)
- KR (wishket+freemoa+u300): 775
- hackathon: 4635

## Category Top (DB)
- hackathon-project: 2400 (30.7%)
- competitive-programming: 2143 (27.4%)
- AI·데이터: 1425 (18.2%)
- 기타: 1105 (14.1%)
- (미분류): 375 (4.8%)
- 웹: 192 (2.5%)
- 기획: 56 (0.7%)
- 인프라: 33 (0.4%)
- 디자인: 19 (0.2%)
- bug-bounty: 17 (0.2%)
- 하드웨어·IoT: 14 (0.2%)
- 앱: 14 (0.2%)
- crowdsourcing: 9 (0.1%)
- hackathon: 5 (0.1%)
- 블록체인: 2 (0.0%)
- 플랫폼: 1 (0.0%)

## Budget KR (wishket+freemoa+u300)
- 0-100만: 20
- 100-500만: 69
- 500-1000만: 59
- 1000-3000만: 103
- 3000-5000만: 44
- 5000만-1억: 17
- 1억+: 10
- (미공개): 453

## Keyword Top 15 (global)
- cf: 1555
- next.js: 836
- fastapi: 720
- vite: 696
- ai: 576
- icpc: 543
- vercel: 520
- api: 422
- tailwind: 388
- tailwindcss: 366
- supabase: 358
- cockroachdb: 334
- claude: 242
- gemini-api: 216
- tailwind-css: 206

## Persona 14 Cards - Fresh Metrics vs Stored
### 1. sig-01 [add] SI 모바일 보일러플레이트 마켓 (한국 raw 217건 기반)
- persona: SI-PM / consensus: high / confidence: high
- summary: 한국 wishket 318건 본문 grep: 모바일 83 + 앱 78 + 반응형 62 = **217건 (68.2%)**. 8/28 신규 4건(NFC 800만/유지보수 30만/소개팅앱 300만/맘캐어 1,000만)도 ...
  - stored evidence: 한국 wishket 본문 모바일+앱+반응형 grep = 83 + 78 + 62 = 217건 / 318 (68.2%)
  - stored evidence: 한국 freemoa 모바일+앱 = 8 + 13 = 21건 / 44 (47.7%)
  - stored evidence: 한국 u300 본문 앱 = 30건 / 429
  - fresh DB KR grep: 모바일=144, 앱=156, 반응형=98, KR total=775 (stored 83+78+62=217/318)

### 2. sig-02 [add] 관리자 콘솔 마켓플레이스 (한국 raw 224건)
- persona: SI-PM / consensus: high / confidence: high
- summary: 한국 wishket 본문 grep: 관리자 104 + 대시보드 32 + 분석 76 + 시각화 17 = **229건 (72%)**. 8/20 wishket 9건 중 6건(관리자/대시보드/분석/CRM/BI/리포트)도 같...
  - stored evidence: 한국 wishket 본문 관리자 grep = 104건 (32.7%)
  - stored evidence: 한국 wishket 분석 grep = 76건
  - stored evidence: 한국 wishket 대시보드 grep = 32건
  - fresh '관리자': 207 (stored sig-02: 104/76/32/17)
  - fresh '대시보드': 105 (stored sig-02: 104/76/32/17)
  - fresh '분석': 196 (stored sig-02: 104/76/32/17)
  - fresh '시각화': 59 (stored sig-02: 104/76/32/17)

### 3. sig-03 [add] PG + SSO + KMS 통합 보일러플레이트 (한국 raw 90건 + 1억+ 10건)
- persona: SI-PM / consensus: high / confidence: high
- summary: 한국 wishket 본문 grep: 결제 52 + PG 16 + 인증 22 + 보안 18 = **108건 (34%)**. 1억+ 대형 10건 모두 '결제/보안/O2O' 결. PG사 3사 + 인증/암호화 매번 다름 =...
  - stored evidence: 한국 wishket 본문 결제 grep = 52건
  - stored evidence: 한국 wishket PG grep = 16건
  - stored evidence: 한국 wishket 인증 grep = 22건
  - fresh '결제': 105 (stored 52/16/22/18)
  - fresh 'PG': 52 (stored 52/16/22/18)
  - fresh '인증': 146 (stored 52/16/22/18)
  - fresh '보안': 136 (stored 52/16/22/18)

### 4. sig-04 [add] AI 어드바이저 SaaS (한국 raw 167건 + 글로벌 mcp 180)
- persona: Global-Researcher / consensus: high / confidence: high
- summary: 한국 wishket 본문 grep: AI 55 + 자동화 36 + 분석 76 + 추천 18 + 검색 18 = **203건**. hackathon 글로벌 mcp 180 + llm 184 + claude 242 + ai...
  - stored evidence: 한국 wishket AI grep = 55건
  - stored evidence: 한국 wishket 자동화+분석 = 36 + 76 = 112건
  - stored evidence: hackathon mcp 180 / llm 184 = 글로벌 표준

### 5. sig-05 [pivot] [방향전환] '수집+가공+추천' 3-in-1 vertical 통합 SaaS (한국 raw 90건)
- persona: SI-PM / consensus: high / confidence: high
- summary: 한국 wishket 본문 grep: 수집 45 + 매칭 4 + 추천 18 + 검색 18 + 크롤링 5 = **90건 (28.3%)**. 매번 단일 vertical만 수주. **수집 → 정제 → 추천/매칭**이 1세트...
  - stored evidence: 한국 wishket 수집 grep = 45건
  - stored evidence: 한국 wishket 추천+검색+매칭+크롤링 = 18+18+4+5 = 45건
  - stored evidence: 재발주 '크롤링+여성커뮤니티' = 2건 (분절 수주 신호)

### 6. sig-06 [add] 레거시 → Next.js 이전 자동화 (한국 raw 25건 + 1억+ 다수)
- persona: SI-PM / consensus: mid / confidence: mid
- summary: 한국 wishket 본문 grep: 리뉴얼 20 + 재구축 5 = **25건**. 8/20 '여행 커머스 WordPress → Next.js' 3,000만, 1억+ '지식산업센터 프롭테크 1차 MVP 웹' 1억, '...
  - stored evidence: 한국 wishket 본문 리뉴얼 grep = 20건
  - stored evidence: 한국 wishket 재구축 grep = 5건
  - stored evidence: 8/20 wishket 'WordPress→Next.js' = id 313, 3,000만

### 7. sig-07 [add] 예약/O2O 풀스택 마켓 (한국 raw 89건 + 1억+ 4건)
- persona: SI-PM / consensus: high / confidence: high
- summary: 한국 wishket 본문 grep: 예약 23 + 위치 18 + 배송 22 + 앱 78 = **141건**. freemoa 위치 22(50%)/예약 2/숙박 2. **freemoa의 50%가 위치 기반**. 1억+ ...
  - stored evidence: 한국 wishket 본문 예약+위치+배송 = 23 + 18 + 22 = 63건
  - stored evidence: 한국 freemoa 위치 grep 1위 = 22건 / 44 (50%)
  - stored evidence: 1억+ 4건 (O2O/스마트) = 의료 1.8억, 무인세탁 1.2억, 횡단보도 1.2억, 프롭테크 1억
  - fresh 예약/위치/배송: 54/92/23

### 8. sig-08 [add] u300 ESG/바이오 vertical 자문 + 매칭 (429건 hashTags 강신호)
- persona: Startup-CTO / consensus: mid / confidence: mid
- summary: u300 429건 hashTags/description 직접: AI 160 + 의료 83 + 바이오 78 + 친환경 38 + 에듀테크 28 + 에너지 19 + 로봇 13. **u300의 32% (137건)가 ESG/...
  - stored evidence: u300 본문 친환경 grep = 38건
  - stored evidence: u300 본문 에너지/로봇 = 19 + 13 = 32건
  - stored evidence: u300 ipoPart 바이오/의료 70건 = 16% (1위 트랙)

### 9. sig-09 [add] MCP/LLM 도구 마켓플레이스 (k_hackathon 5건 + mcp 180)
- persona: Global-Researcher / consensus: mid / confidence: mid
- summary: k_hackathon 5건 본문 직접: 'SSAFY × Kakao AI Hackathon', '네이버 Claude Code 사내 도입', 'AI 도입 후기 1위', 'AI native로 일해 보는 경험'. hacka...
  - stored evidence: k_hackathon 5건 본문 직접 확인 = SSAFY×Kakao / 네이버 Claude Code / 우아한형제들
  - stored evidence: hackathon mcp 180 = 글로벌 표준
  - stored evidence: hackathon claude 242 / llm 184 = AI 도구 1-2위

### 10. sig-10 [add] u300 'AI SaaS' 투자+엔지니어링 (u300 160 + SaaS 25 hashTags)
- persona: Startup-CTO / consensus: mid / confidence: mid
- summary: u300 429건 hashTags: AI 160 + SaaS 25 + 플랫폼 110. **u300의 37.3%가 'AI SaaS'로 창업**. 한국 도급엔 AI SaaS 다수 부재. **엔지니어링 파트너 + 소수 지...
  - stored evidence: u300 본문 AI grep = 160건 / 429 (37.3%)
  - stored evidence: u300 hashTags SaaS 25 = AI×SaaS 신호
  - stored evidence: u300 신규 8/28 AI·데이터 4건 = Recova / Kilexep / Lychee / Kilexep

### 11. sig-11 [add] 음성/화상 AI R&D + 도급 진입 (한국 raw 21건 — low 신호)
- persona: Startup-CTO / consensus: low / confidence: low
- summary: 한국 wishket 본문 grep: 음성 0 / 화상 0 (단어 검색). u300 본문: 음성 16 + 화상 5 = 21건. **한국 도급 풀에 직접 신호 약함** — R&D + 사례집만....
  - stored evidence: 한국 wishket 음성/화상 grep = 0건 (단어 검색 한정)
  - stored evidence: u300 본문 음성 grep = 16건
  - stored evidence: u300 본문 화상 grep = 5건

### 12. sig-12 [add] 사회문제+AI 자문 (drivendata 30건 본문 직접 확인)
- persona: Global-Researcher / consensus: mid / confidence: mid
- summary: drivendata 30건 본문 직접: 'Parkinson's / Earthquake / Disease Spread / Water Table / H1N1 / Children Speech / Document Summa...
  - stored evidence: drivendata 30건 본문 직접 = Parkinson's / Earthquake / Disease / Water / Speech
  - stored evidence: herox 4건 = Maternal Health / NASA / Evolution AI $10M
  - stored evidence: hackathon tags computer-vision 102 = 의료 영상

### 13. sig-13 [add] 버그바운티/Security Testing SaaS (hackerone 17건 + 한국 raw 18건)
- persona: Global-Researcher / consensus: mid / confidence: mid
- summary: hackerone 17건 본문: bounty 14 / vulnerability 13 / scope 13 / security 13 / RCE 9. 한국 wishket 본문 보안 18 / 암호화 5. **글로벌 표준 =...
  - stored evidence: hackerone 17건 본문 grep = bounty 14, vulnerability 13, RCE 9
  - stored evidence: 한국 wishket 본문 보안 grep = 18건
  - stored evidence: 한국 wishket 암호화 grep = 5건

### 14. sig-14 [watch] [관망] K-해커톤 'AI 도입 후기' — 1-2분기 후 도급 시장 진입
- persona: Global-Researcher / consensus: mid / confidence: mid
- summary: k_hackathon 5건 본문 직접 확인: 'AI 도입 후기 1위', 'AI 시대의 인간 역할', 'AI native로 일하는 경험'. **한국 대기업 AI 도구 도입 사례가 1-2분기 안에 도급 시장으로 진입**...
  - stored evidence: k_hackathon 5건 본문 = 네이버 Claude Code / 우아한형제들 / SSAFY×Kakao
  - stored evidence: u300 '에이전트' 4건 (hashTags) = 신규 등장
  - stored evidence: hackathon global claude 242 / mcp 180 = 선두 신호

- analysis_category: 16 rows (2026-08)
- analysis_budget: 8 rows (2026-08)
- analysis_keyword: 30 rows (2026-08)
- analysis_insights: 14 rows (2026-08)

## Hackathon Tech (DB)
- cf: 1555
- next.js: 836
- fastapi: 720
- vite: 696
- ai: 576
