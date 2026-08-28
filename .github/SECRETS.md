# GitHub Secrets / Vars — 운영자가 직접 등록

이 저장소의 GitHub Actions가 동작하려면 다음 항목이 필요합니다. **민감 값(API 토큰, DSN)은 절대 채팅/이슈/PR/위키에 붙여 넣지 마세요.** 본인 워크스테이션에서만 `gh secret set` 또는 GitHub 웹 UI(Settings → Secrets and variables → Actions)로 등록하세요.

## Secrets (Settings → Secrets and variables → Actions → New repository secret)

| 이름 | 용도 | 어디서 발급 |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Workers·Pages 배포 | https://dash.cloudflare.com/profile/api-tokens — 템플릿 "Edit Cloudflare Workers" 또는 직접 "Create Token" (권한: Account.Workers Scripts:Edit, Account.Workers KV Storage:Edit, Account.Pages:Edit, Account.Account Settings:Read, Zone.Zone:Read) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 계정 ID | `npx wrangler whoami` 의 Account ID (이 워크스테이션 값: `ffd9a82c0fb9a5a7d9001eb7de25bef5`) |
| `PG_DSN` | Neon PostgreSQL 연결 문자열 | `refresh-hackathon-channels.yml`이 `load_hackathons.py`에 주입 (없으면 sqlite fallback) |

## Variables (Settings → Secrets and variables → Actions → New repository variable)

| 이름 | 용도 |
|---|---|
| `WORKER_PUBLIC_URL` | SPA에 박힐 API 베이스 URL. 예: `https://market-dashboard-worker.wj94128871.workers.dev` |

## 등록 절차 예시 (이 워크스테이션)

```bash
# 1) Cloudflare API 토큰 (브라우저에서 복사 후 한 번만 붙여넣기 — 히스토리 남지 않음)
gh secret set CLOUDFLARE_API_TOKEN --repo wj94128871/sujibki
# (대화형) 프롬프트에 토큰 붙여넣고 Enter

# 2) Cloudflare Account ID
gh secret set CLOUDFLARE_ACCOUNT_ID --repo wj94128871/sujibki --body "ffd9a82c0fb9a5a7d9001eb7de25bef5"

# 3) Neon DSN (브라우저에서 복사)
gh secret set PG_DSN --repo wj94128871/sujibki
# (대화형) DSN 붙여넣기

# 4) Worker 공개 URL (Variable, Secret 아님)
gh variable set WORKER_PUBLIC_URL --repo wj94128871/sujibki --body "https://market-dashboard-worker.wj94128871.workers.dev"
```

등록 확인:

```bash
gh secret list  --repo wj94128871/sujibki
gh variable list --repo wj94128871/sujibki
```

## 운영 흐름

- `main` 푸시 → `deploy.yml` 자동 실행 (테스트 → 워커 배포 → 페이지 배포)
- 매일 18:00 UTC → `refresh-hackathon-channels.yml` 자동 실행 (Cron)
- 수동 실행: Actions 탭 → "market-dashboard deploy" → Run workflow / "refresh-hackathon-channels" → Run workflow
