import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma needs to be bundled server-side
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
