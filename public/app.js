document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const resultsContainer = document.getElementById('results');

  // Suchfunktion
  async function searchTorrents(query) {
    try {
      // Ladeanimation anzeigen
      resultsContainer.innerHTML = `
        <div class="placeholder">
          <div class="pulse-loader"></div>
          <p>Suche läuft...</p>
        </div>
      `;

      // API-Anfrage
      const response = await fetch(`/api/q.php?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) throw new Error('API-Fehler');
      
      const data = await response.json();
      
      // Ergebnisse anzeigen
      if (data.length === 0) {
        resultsContainer.innerHTML = `
          <div class="placeholder">
            <p>Keine Ergebnisse gefunden</p>
          </div>
        `;
        return;
      }

      resultsContainer.innerHTML = data.map(torrent => `
        <div class="torrent-card">
          <h3 class="torrent-name">${torrent.name}</h3>
          <div class="torrent-meta">
            <span>💾 ${(torrent.size / 1024 / 1024).toFixed(2)} MB</span>
            <span>🔼 ${torrent.seeders || 0}</span>
            <span>🔽 ${torrent.leechers || 0}</span>
          </div>
          <a href="magnet:?xt=urn:btih:${torrent.info_hash}" class="magnet-link">
            Magnet-Link
          </a>
        </div>
      `).join('');

    } catch (error) {
      console.error('Fehler:', error);
      resultsContainer.innerHTML = `
        <div class="error-message">
          <p>Fehler: ${error.message}</p>
          <button onclick="window.location.reload()" class="magnet-link" style="margin-top: 1rem;">
            Erneut versuchen
          </button>
        </div>
      `;
    }
  }

  // Event-Listener
  searchBtn.addEventListener('click', () => {
    if (searchInput.value.trim()) {
      searchTorrents(searchInput.value.trim());
    }
  });

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && searchInput.value.trim()) {
      searchTorrents(searchInput.value.trim());
    }
  });
});