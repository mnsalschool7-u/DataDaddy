/** @type {import('next').NextConfig} */
const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig = {
  reactStrictMode: true,
  // For static hosting (e.g. GitHub Pages). Local dev and server deploys
  // (e.g. Vercel) leave these unset so the app runs at the domain root with
  // the /api/analyst route intact.
  ...(isStaticExport
    ? {
        output: "export",
        basePath,
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
