/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets a second test server run without touching the main build folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
