/**
 * Base path for static hosting (e.g. GitHub Pages serves under /<repo>/).
 * Set at build time via NEXT_PUBLIC_BASE_PATH. Empty for local dev and Vercel
 * (served at the domain root). Used to resolve public asset URLs like /data/*.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${clean}`;
}
