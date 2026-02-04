import type { NextConfig } from "next";

process.env.BROWSERSLIST_IGNORE_OLD_DATA = '1';

const nextConfig: NextConfig = {
  transpilePackages: ['@acme/db', '@acme/integrations', '@acme/core'],
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ['sharp'],
};

export default nextConfig;