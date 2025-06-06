document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const resultsContainer = document.getElementById('results');
  const errorModal = document.getElementById('errorModal');
  const errorMessage = document.getElementById('errorMessage');
  const retryBtn = document.getElementById('retryBtn');
  
  let currentSearch = '';

  // API-Anfrage mit Error-Handling
  async function fetchTorrents(query) {
    try {
      showLoading();
      
      const response = await fetch(`/api/q.php?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid API response');
      }
      
      return data;
      
    } catch (error) {
      console.error('API Error:', error);
      showError(`API-Fehler: ${error.message}`);
      return null;
    }
  }

  // Ergebnisse anzeigen
  function displayResults(data) {
    if (!data || data.length === 0) {
      resultsContainer.innerHTML = `
        <div class="placeholder animate__animated animate__fadeIn">
          <p>Keine Ergebnisse gefunden für "${currentSearch}"</p>
        </div>
      `;
      return;
    }
    
    resultsContainer.innerHTML = data.map(torrent => `
      <div class="torrent-card animate__animated animate__fadeIn">
        <h3 class="torrent-name">${torrent.name || 'Unbekannter Torrent'}</h3>
        <div class="torrent-meta">
          <span>💾 ${formatSize(torrent.size)}</span>
          <span>🔼 ${torrent.seeders || 0}</span>
          <span>🔽 ${torrent.leechers || 0}</span>
        </div>
        <a href="magnet:?xt=urn:btih:${torrent.info_hash}" class="magnet-link">
          Magnet-Link
        </a>
      </div>
    `).join('');
  }

  // Hilfsfunktionen
  function formatSize(bytes) {
    if (!bytes) return '0 MB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  function showLoading() {
    resultsContainer.innerHTML = `
      <div class="placeholder">
        <div class="neon-loader"></div>
        <p>Suche nach "${currentSearch}"...</p>
      </div>
    `;
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorModal.style.display = 'flex';
  }

  function hideError() {
    errorModal.style.display = 'none';
  }

  // Event-Listener
  searchBtn.addEventListener('click', executeSearch);
  
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') executeSearch();
  });

  retryBtn.addEventListener('click', () => {
    hideError();
    if (currentSearch) executeSearch();
  });

  // Hauptsuchfunktion
  async function executeSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    
    currentSearch = query;
    const data = await fetchTorrents(query);
    
    if (data) {
      displayResults(data);
    }
  }

  // Initialer Platzhalter
  resultsContainer.innerHTML = `
    <div class="placeholder animate__animated animate__fadeIn">
      <div class="neon-loader"></div>
      <p>Gib einen Suchbegriff ein</p>
    </div>
  `;
});