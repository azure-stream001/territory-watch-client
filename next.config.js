/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return [
      { source: '/api/proxy/:path*', destination: `${apiUrl}/api/:path*` },
      // Proxy media (scene previews, etc.) so the map can load Sentinel imagery same-origin
      { source: '/media/:path*', destination: `${apiUrl}/media/:path*` },
    ];
  },
};

module.exports = nextConfig;
