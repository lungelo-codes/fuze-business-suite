const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname),
    };
    return config;
  },
  async rewrites() {
    return [];
  },
  env: {
    FRAPPE_URL: process.env.FRAPPE_URL,
  },
};

module.exports = nextConfig;
