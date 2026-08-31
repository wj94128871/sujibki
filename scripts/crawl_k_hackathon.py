#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
K-해커톤 — 한국 회사 기술 블로그 RSS 모음 + hackathon/사내 해커톤 키워드 필터
- 입력: RSS 피드 (kakao, toss, naver-d2, naver-cloud, woowahan, daangn, coupang, banksalad, musinsa)
- 봇: 없음 (feedparser 또는 간단 XML 파싱)
- 필터: 제목/요약에 hackathon, 해커톤, hack day, hackathon day, 사내 해커톤, hack 등
출력: crawled/k_hackathon/
사용법:
  python crawl_k_hackathon.py [--max-detail 50] [--days 365]
"""
from __future__ import annotations
import argparse, json, os, re, sys, time, logging
import urllib.request, ssl
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone, timedelta



def _parse_feed_regex(txt: str) -> list[dict]:
    """Medium 같이 XML이 깨질 때의 regex 폴백 — title/link/pubDate/description 추출."""
    items: list[dict] = []
    # RSS 2.0: <item> ... </item>
    for m in re.finditer(r"<item\b[^>]*>(.*?)</item>", txt, re.S):
        chunk = m.group(1)
        title = re.search(r"<title(?:\s[^>]*)?>(.*?)</title>", chunk, re.S)
        link = re.search(r"<link(?:\s[^>]*)?>(.*?)</link>", chunk, re.S)
        pub = re.search(r"<pubDate(?:\s[^>]*)?>(.*?)</pubDate>", chunk, re.S)
        desc = re.search(r"<description(?:\s[^>]*)?>(.*?)</description>", chunk, re.S)
        items.append({
            "title": _strip_xml(title.group(1)) if title else "",
            "link": _strip_xml(link.group(1)) if link else "",
            "pub": _strip_xml(pub.group(1)) if pub else "",
            "summary": _strip_xml(desc.group(1)) if desc else "",
        })
    return items


def _strip_xml(s: str) -> str:
    """CDATA 태그 제거 + 간단 엔티티 디코드 + 태그 제거."""
    s = re.sub(r"<!\[CDATA\[(.*?)\]\]>", r"\1", s, flags=re.S)
    s = re.sub(r"<[^>]+>", " ", s)
    s = (s.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
           .replace("&quot;", chr(34)).replace("&#39;", "'").replace("&apos;", "'"))
    return re.sub(r"\s+", " ", s).strip()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", stream=sys.stdout)
log = logging.getLogger("k_hackathon")

# 한국 주요 기술 블로그 RSS
SOURCES = [
    ("kakao",     "https://tech.kakao.com/feed/"),
    ("toss",      "https://toss.tech/rss.xml"),
    ("naver_d2",  "https://d2.naver.com/d2.atom"),
    ("naver_cloud", "https://medium.com/feed/naver-cloud-platform"),
    ("woowahan",  "https://techblog.woowahan.com/feed/"),
    ("daangn",    "https://medium.com/feed/daangn"),
    ("coupang",   "https://medium.com/feed/coupang-engineering"),
    ("banksalad", "https://medium.com/feed/banksalad"),
    ("musinsa",   "https://medium.com/feed/musinsa-tech"),
]

# 해커톤 관련 키워드 (제목 + 요약 매칭)
HACK_KEYWORDS = [
    "hackathon", "해커톤", "hack day", "hackathon day", "사내 해커톤",
    "hack fest", "hackfest", "make-a-thon", "ideathon", "devday",
    "demo day", "데모데이", "내부 해커톤", "internal hackathon",
]

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"


def fetch(url: str) -> bytes:
    ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml, application/atom+xml, text/xml, */*"})
    return urllib.request.urlopen(req, timeout=20, context=ctx).read()


def parse_feed(content: bytes) -> list[dict]:
    """RSS 2.0 / Atom 1.0 모두 지원. 반환: [{title, link, pub, summary, tags}]"""
    items: list[dict] = []
    # Medium 일부 피드는 HTML 엔티티/이모지/CDATA 섞여 ET가 깨짐 → lenient 폴백
    txt = content.decode("utf-8", errors="ignore")
    # 1) 정식 XML 파싱 시도
    try:
        root = ET.fromstring(content)
    except ET.ParseError as e:
        log.warning("  XML 정식 파싱 실패, regex 폴백: %s", e)
        return _parse_feed_regex(txt)
    # 2) 정상 파싱 후 RSS/Atom 추출
    # RSS 2.0
    for it in root.iter("item"):
        title = (it.findtext("title") or "").strip()
        link = (it.findtext("link") or "").strip()
        pub = (it.findtext("pubDate") or "").strip()
        desc = (it.findtext("description") or "").strip()
        items.append({"title": title, "link": link, "pub": pub, "summary": desc})
    # Atom 1.0
    ns = {"a": "http://www.w3.org/2005/Atom"}
    for it in root.iter("{http://www.w3.org/2005/Atom}entry"):
        title = (it.findtext("{http://www.w3.org/2005/Atom}title") or "").strip()
        link_el = it.find("{http://www.w3.org/2005/Atom}link")
        link = (link_el.get("href") if link_el is not None else "").strip()
        pub = (it.findtext("{http://www.w3.org/2005/Atom}published")
               or it.findtext("{http://www.w3.org/2005/Atom}updated") or "").strip()
        desc = (it.findtext("{http://www.w3.org/2005/Atom}summary")
                or it.findtext("{http://www.w3.org/2005/Atom}content") or "").strip()
        items.append({"title": title, "link": link, "pub": pub, "summary": desc})
    return items


def is_hackathon(item: dict) -> bool:
    text = (item["title"] + " " + item["summary"]).lower()
    for kw in HACK_KEYWORDS:
        if kw in text:
            return True
    return False


def parse_pub(pub: str) -> str:
    if not pub:
        return ""
    try:
        dt = parsedate_to_datetime(pub)
        if dt is None:
            return pub
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
    except Exception:
        return pub


def within_days(pub_iso: str, days: int) -> bool:
    if not pub_iso or days <= 0:
        return True
    try:
        dt = datetime.fromisoformat(pub_iso.replace("Z", "+00:00"))
    except Exception:
        return True
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    return dt >= cutoff


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-detail", type=int, default=200)
    ap.add_argument("--days", type=int, default=365, help="최근 N일 (0=제한 없음)")
    ap.add_argument("--out", default="crawled/k_hackathon")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    all_matches: list[dict] = []
    meta_by_source: dict[str, dict] = {}

    for src_name, url in SOURCES:
        log.info("소스 %s -> %s", src_name, url)
        try:
            content = fetch(url)
        except Exception as e:
            log.warning("  %s fetch 실패: %s", src_name, e)
            meta_by_source[src_name] = {"url": url, "error": str(e)}
            continue
        # raw 저장
        with open(os.path.join(args.out, f"feed_{src_name}.xml"), "wb") as f:
            f.write(content)
        items = parse_feed(content)
        log.info("  items=%d", len(items))
        matched = 0
        for it in items:
            if not is_hackathon(it):
                continue
            pub = parse_pub(it["pub"])
            if not within_days(pub, args.days):
                continue
            all_matches.append({
                "source": src_name,
                "url": it["link"],
                "title": it["title"],
                "summary": re.sub(r"<[^>]+>", " ", it["summary"])[:600].strip(),
                "pub": pub,
            })
            matched += 1
        meta_by_source[src_name] = {"url": url, "items": len(items), "matched": matched}

    log.info("총 매치 %d건", len(all_matches))

    # dedup (title+source)
    seen = set(); uniq = []
    for m in all_matches:
        k = (m["source"], m["title"].lower())
        if k in seen:
            continue
        seen.add(k); uniq.append(m)
    log.info("유니크 %d건", len(uniq))

    targets = uniq[: args.max_detail] if args.max_detail > 0 else uniq
    with open(os.path.join(args.out, "competitions.json"), "w", encoding="utf-8") as f:
        json.dump(targets, f, ensure_ascii=False, indent=2)
    meta = {
        "sources": meta_by_source,
        "items_total": len(uniq),
        "detail_count": len(targets),
        "collected_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "days": args.days,
    }
    with open(os.path.join(args.out, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    log.info("저장: %s", args.out)


if __name__ == "__main__":
    main()
