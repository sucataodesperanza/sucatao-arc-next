import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  transpilePackages: ["@vercel/analytics"],
  images: {
    unoptimized: true,
  },
}

export default nextConfig
