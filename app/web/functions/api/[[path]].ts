// /api/* 를 Cloudflare Worker로 프록시 (SPA와 동일 도메인 → CORS 불필요)
export const onRequest: PagesFunction<{ API_ORIGIN: string }> = async ({ request, env }) => {
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, env.API_ORIGIN);
  return fetch(new Request(target, request));
};
