import { describe, it, expect } from "vitest";
import { rankKeywords, budgetBuckets, growthRate, sortByShare, fb } from "../src/agg/wasmBridge.js";

describe("집계 유틸 — TS 폴백(와 Rust WASM 대체) 동작", () => {
  it("rankKeywords: 중복 카운트·상위 N 정렬", () => {
    const out = rankKeywords(["python", "react", "python", "rust", "rust", "rust", "js"], 3);
    expect(out[0]).toEqual({ keyword: "rust", cnt: 3 });
    expect(out.length).toBe(3);
    expect(fb.rankKeywords(["a", "b", "a"], 2)).toEqual([{ keyword: "a", cnt: 2 }, { keyword: "b", cnt: 1 }]);
  });

  it("budgetBuckets: 구간 분류 + null 별도 카운트", () => {
    const out = budgetBuckets([25_000_000, 3_000_000, null, 60_000_000], 1);
    expect(out.some((x: any) => x.bucket === "1000-3000만")).toBe(true);
    expect(out.some((x: any) => x.bucket === "5000만+")).toBe(true);
    expect(out.some((x: any) => x.bucket === "(null 1)")).toBe(true);
  });

  it("growthRate: prev<=0 → null, 양수 증가율", () => {
    expect(growthRate(0, 10)).toBeNull();
    expect(growthRate(100, 110)).toBe(10);
  });

  it("sortByShare: 점유율 합 100 근사", () => {
    const out = sortByShare({ a: 60, b: 40 });
    expect(out[0].key).toBe("a");
    const sum = out.reduce((s: number, x: any) => s + x.sharePct, 0);
    expect(Math.abs(sum - 100)).toBeLessThan(1.5);
  });
});
