Module.exports = {
  trailingSlash: true,
  async rewrites() {
    // Liste mit Backup-APIs, falls apibay.org blockiert ist
    const API_MIRRORS = [
      "https://apibay.org",      // Primäre API
      "https://tpbproxy.xyz",    // Mirror 1
      "https://piratebayproxy.info" // Mirror 2
    ];

    return [
      {
        source: "/api/:path*",
        destination: `${API_MIRRORS[0]}/:path*`, // Nutzt ersten Mirror
      },
      // Fallback-Route für Blockade
      {
        source: "/fallback-api/:path*",
        destination: `${API_MIRRORS[1]}/:path*`, // Automatischer Wechsel
      }
    ];
  },
  // Optimiertes Caching für Proxy-Routen
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=60" },
        ],
      }
    ];
  }
};
