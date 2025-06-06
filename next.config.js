module.exports = {
  trailingSlash: true, // Wichtig für statische Exports
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://apibay.org/:path*", // Proxy zu TPB-API
      },
    ];
  },
};