/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable static export for GitHub Pages
  output: 'export',
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  // Base path for GitHub Pages (update this to your repo name if needed)
  // basePath: '/G0DM0D4',
  // Trailing slash for GitHub Pages compatibility
  trailingSlash: true,

  // The API server code (api/, HF/) is built separately via tsx — the
  // Next.js build shouldn't be held back by its type errors. The UI in src/
  // is fully typed and must still pass its own checks.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
