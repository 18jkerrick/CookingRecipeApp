import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@acme/db'],
};

export default nextConfig;