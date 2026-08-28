export function init(): void;
export function rank_keywords(json: string, topN: number): string;
export function budget_buckets(json: string, nullCount: number): string;
export function growth_rate(prev: number, cur: number): number | null;
export function sort_by_share(json: string): string;
