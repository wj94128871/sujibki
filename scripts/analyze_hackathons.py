#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ETL 정규화 결과의 카테고리/키워드 분석 (v2)
- 입력: crawled/_runs/hackathons_normalized.json
- 출력: crawled/_runs/hackathons_analysis.json
- v2 변경:
  * 채널별 baseline 카테고리 (Codeforces → competitive-programming, HackerOne → security, ...)
  * 강한 채널-시그널 키워드(예: "codeforces", "hackerone")가 있으면 룰 매칭을 보강만 함
  * "open/upcoming" phase인 경우 카테고리 분포를 별도 집계
  * 상위 키워드는 카테고리 매칭이 아닌 일반 토큰 카운트
"""
from __future__ import annotations
import argparse, json, os, re, sys, time, logging
from collections import Counter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", stream=sys.stdout)
log = logging.getLogger("analyze")

# 도메인 카테고리 키워드 사전
CATEGORY_RULES = {
    "AI/ML":       ["ai", "ml", "machine learning", "deep learning", "llm", "gpt", "neural",
                    "tensorflow", "pytorch", "huggingface", "transformer", "rag", "agent",
                    "openai", "anthropic", "stable diffusion", "diffusion", "embedding",
                    "llama", "mistral", "gemini", "claude", "chatgpt"],
    "Data Science": ["data", "dataset", "analytics", "visualization", "dashboard", "kaggle",
                     "pandas", "sql", "bigquery", "snowflake", "dbt", "etl", "feature store"],
    "Computer Vision": ["vision", "image", "video", "object detection", "segmentation", "ocr",
                       "yolo", "opencv", "pose", "wildlife", "kelp", "conservation"],
    "NLP":         ["nlp", "text", "language", "translation", "summarization", "sentiment",
                   "chatbot", "rag", "document", "tokeniz", "named entity"],
    "Healthcare":  ["health", "medical", "clinical", "patient", "doctor", "disease", "biomedical",
                    "covid", "pharma", "drug", "alzheimer", "parkinson", "cancer", "medicine",
                    "epidemic", "vaccine", "flu", "elder", "aging", "sphere", "dengai", "fever",
                    "hospital", "diagnos"],
    "Climate":     ["climate", "carbon", "sustainability", "renewable", "solar", "wind",
                    "environment", "energy", "green", "battery", "wildfire", "deforestation",
                    "ocean", "kelp", "wildlife", "photovoltaic", "electricity"],
    "Education":   ["education", "learning", "student", "tutor", "school", "literacy",
                    "teacher", "course", "reading", "moon"],
    "Finance":     ["finance", "fintech", "bank", "payment", "trading", "credit", "loan",
                    "insurance", "blockchain", "crypto", "defi", "risk", "fraud",
                    "telco", "troubleshoot"],
    "Public/Social": ["social", "public", "government", "civic", "humanitarian", "ngo",
                      "community", "accessibility", "disability", "a11y", "inclusion",
                      "united nations", "openideo", "social venture"],
    "Security":    ["security", "vulnerability", "bounty", "cve", "exploit", "pentest",
                    "bug", "xss", "csrf", "ssrf", "rce", "ctf", "hackerone",
                    "safe harbor", "vdp", "responsible disclosure"],
    "IoT/Hardware": ["iot", "hardware", "embedded", "raspberry", "arduino", "robotics",
                     "drone", "sensor", "spacecraft", "satellite", "cube", "camera trap",
                     "geiger", "telescope"],
    "Web/Frontend": ["web", "frontend", "react", "vue", "svelte", "next.js", "typescript",
                     "css", "html", "ui", "ux", "figma", "tailwind", "a11ycanvas",
                     "nextjs", "vercel", "jamstack"],
    "Backend/API": ["backend", "api", "graphql", "rest", "grpc", "microservice", "server",
                    "node", "django", "fastapi", "spring", "express", "lambda", "edge"],
    "Mobile":      ["mobile", "ios", "android", "flutter", "react native", "swift", "kotlin"],
    "DevOps":      ["devops", "kubernetes", "docker", "ci/cd", "terraform", "ansible",
                    "aws", "gcp", "azure", "cloud", "serverless", "helm", "argo"],
    "Competitive Programming": ["codeforces", "icpc", "ioi", "acm", "competitive programming",
                                "round", "div. 1", "div. 2", "div. 3", "rated"],
    "Agriculture": ["agriculture", "crop", "farm", "soil", "yield", "maize", "wheat", "rice",
                    "drought", "farming"],
    "Smart City":  ["traffic", "transit", "smart city", "urban", "city", "ride", "mobility",
                    "parking", "intersection"],
    "Retail/E-commerce": ["ecommerce", "shopping", "retail", "cart", "checkout", "product",
                          "recommendation", "review", "wishlist"],
}

# 채널별 baseline 카테고리 (이 채널의 모든 항목에 강제 부여)
CHANNEL_BASELINE = {
    "codeforces":  ["Competitive Programming"],
    "hackerone":   ["Security"],
    "hackerearth": ["Other"],                # 일반 분류 어려움
    "drivendata":  [],
    "zindi":       [],
    "devpost":     [],
    "herox":       ["Other"],
    "topcoder":    ["Competitive Programming"],
    "openideo":    ["Public/Social"],
}


# 짧은 키워드 충돌 방지: 'ml'은 ai/ml에만, 'ai' 단독도 OK
# 'round'가 모든 Codeforces 라운드에 매치되어 다른 카테고리에 부풀리는 것 방지
def _matches(text: str, kw: str) -> bool:
    """키워드 매칭 — 짧은 토큰은 word boundary, 긴 토큰은 substring."""
    if len(kw) <= 4 and re.match(r"^[a-z0-9]+$", kw):
        # 단어 경계 검사
        return re.search(rf"\b{re.escape(kw)}\b", text) is not None
    return kw in text


def classify(text: str, source: str) -> list[str]:
    """Return matching category labels (multi-label). 룰 매칭 우선, 없으면 채널 baseline."""
    t = (text or "").lower()
    hits: list[str] = []
    if t:
        for cat, kws in CATEGORY_RULES.items():
            for kw in kws:
                if _matches(t, kw):
                    hits.append(cat)
                    break
    if not hits:
        baseline = CHANNEL_BASELINE.get(source, [])
        if baseline:
            hits = list(baseline)
        else:
            hits = ["Other"]
    return hits


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", default="crawled/_runs/hackathons_normalized.json")
    ap.add_argument("--out", default="crawled/_runs/hackathons_analysis.json")
    args = ap.parse_args()
    if not os.path.exists(args.inp):
        log.error("입력 없음: %s (먼저 etl_hackathons.py 실행)", args.inp)
        sys.exit(1)
    data = json.load(open(args.inp, "r", encoding="utf-8"))
    items = data.get("items", [])
    log.info("입력: %d건", len(items))

    cat_counter: Counter = Counter()
    cat_by_source: dict[str, Counter] = {}
    cat_by_phase: dict[str, Counter] = {"open": Counter(), "upcoming": Counter(), "finished": Counter(), "unknown": Counter()}
    open_by_cat: Counter = Counter()
    prize_sum_by_cat: Counter = Counter()
    keyword_counter: Counter = Counter()
    # Per-source category breakdown
    source_cat_matrix: dict[str, dict[str, int]] = {}

    for it in items:
        text = " ".join([
            it.get("title", ""), it.get("brief", ""), it.get("category", ""),
            " ".join(it.get("tags", [])), it.get("org", ""),
        ])
        cats = classify(text, it.get("source", ""))
        src = it.get("source", "unknown")
        for c in cats:
            cat_counter[c] += 1
            cat_by_source.setdefault(c, Counter())[src] += 1
            phase = it.get("phase", "unknown")
            cat_by_phase[phase][c] += 1
            if phase in ("open", "upcoming"):
                open_by_cat[c] += 1
            if it.get("prize_usd"):
                prize_sum_by_cat[c] += int(it["prize_usd"])
            source_cat_matrix.setdefault(src, {}).setdefault(c, 0)
            source_cat_matrix[src][c] += 1

        # 키워드 카운트 (제목 토큰, 길이 4+)
        for tok in re.findall(r"[A-Za-z][A-Za-z0-9+#-]{3,}", text):
            keyword_counter[tok.lower()] += 1

    top_keywords = keyword_counter.most_common(50)
    top_open_cats = open_by_cat.most_common()
    top_prize_cats = sorted(prize_sum_by_cat.items(), key=lambda x: -x[1])

    log.info("카테고리 분포 (전체): %s", dict(cat_counter.most_common(10)))
    log.info("오픈/예정 카테고리 TOP: %s", top_open_cats[:10])
    log.info("상금 합계 카테고리 TOP: %s", top_prize_cats[:10])

    analysis = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "items_total": len(items),
        "category_count": dict(cat_counter),
        "category_by_source": {c: dict(s) for c, s in cat_by_source.items()},
        "category_by_phase": {p: dict(c) for p, c in cat_by_phase.items()},
        "open_by_category": dict(open_by_cat),
        "prize_usd_by_category": dict(prize_sum_by_cat),
        "source_category_matrix": source_cat_matrix,
        "top_keywords": top_keywords,
    }
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(analysis, f, ensure_ascii=False, indent=2)
    log.info("저장: %s", args.out)
    print()
    print("=== 카테고리 TOP 10 ===")
    for c, n in cat_counter.most_common(10):
        print(f"  {c:25s} {n:5d}")
    print()
    print("=== 오픈/예정 카테고리 TOP 5 ===")
    for c, n in top_open_cats[:5]:
        print(f"  {c:25s} {n:5d}")
    print()
    print("=== 소스별 카테고리 분포 (상위 6 카테고리) ===")
    top_cats = [c for c, _ in cat_counter.most_common(6)]
    print(f"  {'source':18s} " + " ".join(f"{c[:8]:>8s}" for c in top_cats))
    for src in sorted(source_cat_matrix.keys()):
        row = source_cat_matrix[src]
        print(f"  {src:18s} " + " ".join(f"{row.get(c, 0):8d}" for c in top_cats))


if __name__ == "__main__":
    main()
