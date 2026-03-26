/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://traefik:80/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
