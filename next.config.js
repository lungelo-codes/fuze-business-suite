/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [];
  },
  env: {
    FRAPPE_URL: process.env.FRAPPE_URL,
  },
};

module.exports = nextConfig;
