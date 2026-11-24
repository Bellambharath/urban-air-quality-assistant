import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Framer Motion and other packages to be bundled
  experimental: {},
  // Allow images from common AQI data providers
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.googleapis.com" },
      { protocol: "https", hostname: "aqicn.org" },
    ],
  },
  // Environment variable validation at build time
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  },
};

export default nextConfig;
