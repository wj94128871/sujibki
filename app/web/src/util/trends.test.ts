import { describe, it, expect } from "vitest";
import { computeMoM, sign, formatDelta, SOURCE_KEYS, SOURCE_COLORS } from "./trends.js";

describe("트렌드/증감 유틸 (재설계)", () => {
  it("MoM 증감: 전기간 0 이하 → null", () => {
    expect(computeMoM([10, 20, 30])).toBe(50);
    expect(computeMoM([10, 20, 0])).toBe(-100);
    expect(computeMoM([5])).toBe(null);
  });
  it("부호/포맷: +,-,—", () => {
    expect(sign(12.5)).toBe("up");
    expect(sign(-3.1)).toBe("down");
    expect(sign(null)).toBe("flat");
    expect(formatDelta(12.5)).toBe("+12.5%");
    expect(formatDelta(null)).toBe("—");
  });
  it("소스 4색·키 정의", () => {
    expect(SOURCE_KEYS).toEqual(["wishket", "freemoa", "u300", "devpost", "idea"]);
    for (const k of SOURCE_KEYS) expect(SOURCE_COLORS[k]).toBeTruthy();
  });
});
