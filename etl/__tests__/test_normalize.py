"""ETL normalize 단위 테스트 — unittest (no extra deps)"""
import os, sys, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.dirname(ROOT))

from etl.normalize import NORMALIZERS, _parse_prize, _to_int, _iso, _norm_phase
from etl.schema import NormalizedItem


class P(unittest.TestCase):
    def test_parse_prize_usd(self):
        usd, raw = _parse_prize("$11,000 USD"); self.assertEqual(usd, 11000); self.assertEqual(raw, "$11,000 USD")
    def test_parse_prize_eur(self):
        usd, _ = _parse_prize("€35 000 EUR"); self.assertEqual(usd, 37800)
    def test_parse_prize_zar(self):
        usd, _ = _parse_prize("R 100 000 ZAR"); self.assertIsNotNone(usd); self.assertTrue(5000 <= usd <= 6000, usd)
    def test_parse_prize_krw(self):
        usd, _ = _parse_prize("₩1,000,000"); self.assertIsNotNone(usd); self.assertTrue(700 <= usd <= 800, usd)
    def test_parse_prize_empty(self):
        usd, raw = _parse_prize(""); self.assertIsNone(usd); self.assertEqual(raw, "")
    def test_to_int(self):
        self.assertEqual(_to_int("1,234"), 1234); self.assertEqual(_to_int(1234), 1234)
        self.assertIsNone(_to_int("")); self.assertIsNone(_to_int(None))
    def test_iso_epoch(self):
        out = _iso(1700000000); self.assertTrue(out.startswith("2023-"))
    def test_iso_pass(self):
        self.assertEqual(_iso("2025-11-28T14:00:00.000Z"), "2025-11-28T14:00:00.000Z")
    def test_phase_finished(self):
        p, o = _norm_phase("FINISHED", ""); self.assertEqual(p, "finished"); self.assertFalse(o)
    def test_phase_open(self):
        p, o = _norm_phase("CODING", ""); self.assertEqual(p, "open"); self.assertTrue(o)
    def test_phase_before(self):
        p, o = _norm_phase("BEFORE", ""); self.assertEqual(p, "upcoming"); self.assertTrue(o)
    def test_phase_open_flag(self):
        p, o = _norm_phase("", "", open_flag=True); self.assertEqual(p, "open"); self.assertTrue(o)
    def test_zindi(self):
        raw = {"id":"x","title":"X","kind":"competition","open":False,
               "start_time":"2025-11-28T14:00:00.000Z","end_time":"2026-02-01T23:59:00.000Z",
               "reward":"€35 000 EUR","organization":"ITU","participations_count":1322,
               "is_beginner_friendly":False,"reward_type":"prize","url":"https://zindi.africa/x"}
        n = NORMALIZERS["zindi"](raw)
        self.assertIsInstance(n, NormalizedItem); self.assertEqual(n.source, "zindi")
        self.assertEqual(n.prize_usd, 37800); self.assertEqual(n.org, "ITU")
        self.assertEqual(n.phase, "finished"); self.assertFalse(n.is_open)
    def test_codeforces(self):
        raw = {"id":2261,"name":"Round","type":"CF","phase":"BEFORE","frozen":False,
               "durationSeconds":10800,"startTimeSeconds":1792247700}
        n = NORMALIZERS["codeforces"](raw)
        self.assertEqual(n.phase, "upcoming"); self.assertTrue(n.is_open); self.assertIn("CF", n.tags)
    def test_hackerone(self):
        raw = {"handle":"anthropic","title":"HackerOne","text_excerpt":"","url":"https://hackerone.com/anthropic"}
        n = NORMALIZERS["hackerone"](raw)
        self.assertEqual(n.title, "anthropic"); self.assertIn("bug-bounty", n.tags)
    def test_drivendata(self):
        raw = {"slug":"x","title":"Competition: X","brief":"","tags":["#health"],
               "prize_usd":"50,000","deadline":"","url":"https://www.drivendata.org/x"}
        n = NORMALIZERS["drivendata"](raw)
        self.assertEqual(n.title, "X"); self.assertEqual(n.prize_usd, 50000); self.assertEqual(n.category, "#health")
    def test_devpost(self):
        raw = {"slug":"a11ycanvas","title":"A11yCanvas","built_with":["Python","Streamlit"],
               "url":"https://devpost.com/software/a11ycanvas","dev_score":5,"is_dev":True,"len":1000}
        n = NORMALIZERS["devpost"](raw)
        self.assertEqual(n.source, "devpost"); self.assertIn("Python", n.tags)
        self.assertEqual(n.category, "hackathon-project")
    def test_k_hackathon(self):
        raw = {"source":"kakao","title":"카카오 해커톤","summary":"...","url":"https://tech.kakao.com/posts/825",
               "pub":"2026-06-23T10:00:00+00:00"}
        n = NORMALIZERS["k_hackathon"](raw)
        self.assertEqual(n.source, "k_hackathon"); self.assertEqual(n.category, "hackathon")
        self.assertIn("kakao", n.tags); self.assertEqual(n.phase, "finished")
    def test_k_hackathon_future(self):
        # 미래 날짜 → open
        from datetime import datetime, timezone, timedelta
        future = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        raw = {"source":"naver_d2","title":"예정","summary":"","url":"https://x","pub":future}
        n = NORMALIZERS["k_hackathon"](raw)
        self.assertEqual(n.phase, "open"); self.assertTrue(n.is_open)
    def test_herox_basic(self):
        # herox도 drivendata와 유사 형태(슬러그+제목+prize_usd)
        raw = {"slug":"goaero","title":"GoAERO Prize","brief":"emergency response",
               "prize_usd":"$1,000,000","url":"https://www.herox.com/goaero"}
        n = NORMALIZERS["herox"](raw)
        self.assertEqual(n.title, "GoAERO Prize"); self.assertIn("crowdsourcing", n.category)
    def test_normalizers_registry(self):
        # NORMALIZERS에 모든 채널이 등록되어 있는지
        for s in ("drivendata","zindi","codeforces","hackerone","hackerearth",
                  "herox","topcoder","openideo","devpost","k_hackathon"):
            self.assertIn(s, NORMALIZERS, f"missing {s}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
