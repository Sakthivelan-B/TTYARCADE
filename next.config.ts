import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", "*.e2b.app"],
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "same-origin" },
      ...(process.env.TTYARCADE_EMBED_PREVIEW === "1" ? [] : [{ key: "X-Frame-Options", value: "SAMEORIGIN" }]),
    ] }];
  },
};
export default nextConfig;
