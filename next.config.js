/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during builds for Railway deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript errors during builds for Railway deployment
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;