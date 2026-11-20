import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Keep Turbopack rooted at this app inside the monorepo.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
