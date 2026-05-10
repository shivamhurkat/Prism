import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'motion/react'],
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  serverExternalPackages: ['pdf-parse', 'mammoth', 'xlsx'],
};

export default nextConfig;