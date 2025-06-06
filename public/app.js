Document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const resultsContainer = document.getElementById('results');
  const recommendationsContainer = document.getElementById('recommendations'); // Neuer Container für Empfehlungen
  const errorModal = document.getElementById('errorModal');
  const errorMessage = document.getElementById('errorMessage');
  const retryBtn = document.getElementById('retryBtn');
  
  let currentSearch = '';

  // API-Anfrage mit Error-Handling
  async function fetchTorrents(query, targetContainer) {
    try {
      showLoading(targetContainer, query);
      
      // Nutze den neuen API-Endpunkt, um die bestehenden Endpunkte nicht zu stören
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
    } finally {
      // Das Lade-Placeholder wird hier entfernt, wenn Daten geladen wurden
      // oder ein Fehler auftrat
      if (targetContainer.querySelector('.placeholder')) {
        targetContainer.querySelector('.placeholder').remove();
      }
    }
  }

  // Ergebnisse/Empfehlungen anzeigen
  function displayTorrents(data, container) {
    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="placeholder">
          <p>Keine Ergebnisse gefunden.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = data.map(torrent => `
      <div class="torrent-card">
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
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
  }

  function showLoading(container, queryText) {
    container.innerHTML = `
      <div class="placeholder">
        <div class="loader"></div>
        <p>Suche nach "${queryText}"...</p>
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
    if (!query) {
      resultsContainer.innerHTML = `
        <div class="placeholder">
          <p>Bitte gib einen Suchbegriff ein.</p>
        </div>
      `;
      return;
    }
    
    currentSearch = query;
    const data = await fetchTorrents(query, resultsContainer);
    
    if (data) {
      displayTorrents(data, resultsContainer);
      // Wenn eine Suche durchgeführt wird, leere die Empfehlungen
      recommendationsContainer.innerHTML = ''; 
      document.querySelector('.recommendations-section .section-title').style.display = 'none';
    }
  }

  // Empfehlungen beim Laden der Seite
  async function loadRecommendations() {
    // Hier kannst du einige Standard-Suchbegriffe für Empfehlungen verwenden
    // Oder eine dedizierte API für zufällige/beliebte Torrents (falls vorhanden)
    const recommendedQueries = ["linux", "ubuntu", "public domain movies"]; 
    const randomQuery = recommendedQueries[Math.floor(Math.random() * recommendedQueries.length)];

    document.querySelector('.recommendations-section .section-title').style.display = 'block'; // Titel anzeigen
    const data = await fetchTorrents(randomQuery, recommendationsContainer);
    if (data) {
      displayTorrents(data, recommendationsContainer);
    }
  }

  // Initialisierung
  loadRecommendations(); // Lade Empfehlungen beim Start
  resultsContainer.innerHTML = `
    <div class="placeholder">
      <p>Gib einen Suchbegriff ein, um Ergebnisse zu sehen.</p>
    </div>
  `;
});
