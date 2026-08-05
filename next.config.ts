import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // Wichtig: Statische Next.js Seiten unterstützen standardmäßig keine automatische Bildoptimierung
  },
};

export default nextConfig;