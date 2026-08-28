import { describe, it, expect } from "vitest";
import { formatMoney, formatPeriod, confidenceLabel, formatNumber, formatDate } from "./format.js";

describe("UI 포맷 유틸", () => {
  it("예산: 만원→원 포맷", () => {
    expect(formatMoney(25_000_000)).toBe("2,500만원");
    expect(formatMoney(5_000_000, "KRW_MONTH")).toBe("500만/월");
    expect(formatMoney(120_000_000)).toBe("1.2억원");
    expect(formatMoney(null)).toBe("정보 없음");
  });
  it("기간", () => {
    expect(formatPeriod(30)).toBe("1개월");
    expect(formatPeriod(500)).toBe("1.4년");
    expect(formatPeriod(null)).toBe("정보 없음");
  });
  it("신뢰 라벨", () => {
    expect(confidenceLabel("low")).toBe("낮음");
    expect(confidenceLabel("mid")).toBe("중간");
    expect(confidenceLabel("high")).toBe("높음");
  });
  it("숫자/날짜", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
    expect(formatDate("2026-08-20T00:00:00Z")).toBe("2026-08-20");
    expect(formatDate(null)).toBe("정보 없음");
  });
});
