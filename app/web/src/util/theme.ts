/** 다크모드 — OS 선호(auto) + localStorage 우선 (design-system §7) */
export function applyTheme(html: HTMLElement = document.documentElement) {
  const stored = localStorage.getItem("theme");
  if (stored === "dark" || stored === "light") { html.dataset.theme = stored; return; }
  html.dataset.theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
export function getTheme(html: HTMLElement = document.documentElement): "dark" | "light" {
  return html.dataset.theme === "dark" ? "dark" : "light";
}
export function toggleTheme(html: HTMLElement = document.documentElement) {
  const next = getTheme(html) === "dark" ? "light" : "dark";
  html.dataset.theme = next;
  localStorage.setItem("theme", next);
}
