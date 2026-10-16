import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pz/shared"],
  reactStrictMode: true,
};

export default nextConfig;
