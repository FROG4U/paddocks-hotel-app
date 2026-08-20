import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // Admin image uploads are compressed with sharp after they arrive, so the
    // limit has to cover the original camera file, not the saved one.
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
