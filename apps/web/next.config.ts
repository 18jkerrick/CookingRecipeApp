import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@acme/db', '@acme/integrations', '@acme/core'],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;