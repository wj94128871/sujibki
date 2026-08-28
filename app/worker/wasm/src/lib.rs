//! Rust → WASM 집계 보조 (tech-design §1 TQ-2, §11 Epic3).
//! 순수 함수만 포함(CPU 집중). I/O/DB는 TS/Python 책임. TS 폴백(tsFallback.ts)과 동등 출력을 단위테스트로 검증.
//! 빌드: `cargo build --target wasm32-unknown-unknown` 또는 `wasm-pack build --target web --out-dir ../src/agg/pkg`
#![forbid(unsafe_code)]

use wasm_bindgen::prelude::*;
use serde_json::Value;

/// 키워드 랭킹: 문자열 배열 JSON 입력 → [{keyword,cnt}] JSON 출력
#[wasm_bindgen]
pub fn rank_keywords(keywords_json: &str, top_n: usize) -> String {
    let arr: Value = serde_json::from_str(keywords_json).unwrap_or(Value::Null);
    let mut cnt: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    if let Value::Array(items) = arr {
        for it in items {
            if let Value::String(s) = it {
                if !s.is_empty() {
                    *cnt.entry(s).or_insert(0) += 1;
                }
            }
        }
    }
    let mut list: Vec<(String, usize)> = cnt.into_iter().collect();
    list.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    list.truncate(top_n);
    let out: Vec<Value> = list.into_iter()
        .map(|(k, v)| serde_json::json!({"keyword": k, "cnt": v}))
        .collect();
    serde_json::to_string(&out).unwrap_or_else(|_| "[]".into())
}

/// 예산 버킷: 값 배열 JSON(원) + nullCount → [{bucket,count}] JSON. TS budgetBuckets와 동일 규칙.
#[wasm_bindgen]
pub fn budget_buckets(values_json: &str, null_count: usize) -> String {
    let arr: Value = serde_json::from_str(values_json).unwrap_or(Value::Null);
    let mut cnt: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    if let Value::Array(items) = arr {
        for it in items {
            let n = match it {
                Value::Number(num) => num.as_f64(),
                Value::Null => None,
                _ => None,
            };
            if let Some(v) = n {
                let m = v / 10_000.0;
                let bucket = if m < 500.0 { "0-500만" }
                    else if m < 1000.0 { "500-1000만" }
                    else if m < 3000.0 { "1000-3000만" }
                    else if m < 5000.0 { "3000-5000만" }
                    else { "5000만+" };
                *cnt.entry(bucket.to_string()).or_insert(0) += 1;
            }
        }
    }
    let mut list: Vec<(String, usize)> = cnt.into_iter().collect();
    list.sort_by(|a, b| a.0.cmp(&b.0));
    let mut out: Vec<Value> = list.into_iter()
        .map(|(k, v)| serde_json::json!({"bucket": k, "count": v}))
        .collect();
    if null_count > 0 {
        out.push(serde_json::json!({"bucket": format!("(null {})", null_count), "count": null_count}));
    }
    serde_json::to_string(&out).unwrap_or_else(|_| "[]".into())
}

/// 증가율: prev→cur, prev<=0 이면 null
#[wasm_bindgen]
pub fn growth_rate(prev: f64, cur: f64) -> Option<f64> {
    if prev <= 0.0 { return None; }
    Some(((cur - prev) / prev * 1000.0).round() / 10.0)
}

/// 점유율 정렬: {key:count} JSON → [{key,cnt,sharePct}] JSON
#[wasm_bindgen]
pub fn sort_by_share(cnt_json: &str) -> String {
    let obj: Value = serde_json::from_str(cnt_json).unwrap_or(Value::Null);
    let mut total: f64 = 0.0;
    if let Value::Object(map) = &obj {
        for (_, v) in map {
            if let Value::Number(n) = v { total += n.as_f64().unwrap_or(0.0); }
        }
    }
    let total = if total <= 0.0 { 1.0 } else { total };
    let mut list: Vec<(String, f64)> = Vec::new();
    if let Value::Object(map) = &obj {
        for (k, v) in map {
            let c = v.as_f64().unwrap_or(0.0);
            list.push((k.clone(), c));
        }
    }
    list.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    let out: Vec<Value> = list.into_iter()
        .map(|(k, c)| serde_json::json!({"key": k, "cnt": c as u64, "sharePct": ((c / total * 1000.0).round() / 10.0)}))
        .collect();
    serde_json::to_string(&out).unwrap_or_else(|_| "[]".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rank_dedups_and_counts() {
        let out = rank_keywords(r#"["python","react","python"]"#, 10);
        let v: Value = serde_json::from_str(&out).unwrap();
        assert_eq!(v[0]["keyword"], "python");
        assert_eq!(v[0]["cnt"], 2);
    }
    #[test]
    fn budget_threshold() {
        let out = budget_buckets(r#"[25000000,3000000,null]"#, 1);
        let v: Value = serde_json::from_str(&out).unwrap();
        assert!(v[0]["bucket"].as_str().unwrap().contains("1000-3000만"));
        assert!(v.iter().any(|x| x["bucket"].as_str().unwrap().starts_with("(null")));
    }
    #[test]
    fn growth_guard() {
        assert_eq!(growth_rate(0.0, 10.0), None);
        assert_eq!(growth_rate(100.0, 110.0), Some(10.0));
    }
}
