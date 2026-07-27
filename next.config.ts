import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // Admin image uploads are compressed with sharp before saving.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
