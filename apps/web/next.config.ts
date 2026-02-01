import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@acme/db', '@acme/integrations', '@acme/core'],
};

export default nextConfig;