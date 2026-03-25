import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
    ],
  },
  webpack: (config, { dev }) => {
    // OneDrive/AV can break webpack persistent cache writes on Windows.
    // Disabling it in dev prevents random ENOENT + corrupted module runtime.
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
