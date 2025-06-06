Document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const resultsContainer = document.getElementById('results');
  const errorModal = document.getElementById('errorModal');
  const errorMessage = document.getElementById('errorMessage');
  const retryBtn = document.getElementById('retryBtn');
  const mainFooter = document.getElementById('main-footer');
  const systemStatusText = document.getElementById('systemStatusText');
  const statusIndicator = document.getElementById('statusIndicator');
  const systemErrorsList = document.getElementById('systemErrors');

  // ACHTUNG: Hier musst du die URL deines deployten serverless Backends eintragen!
  const SERVERLESS_API_URL = 'DEINE_SERVERLESS_BACKEND_URL/api/search'; // Beispiel: 'https://dein-projekt.vercel.app/api/search'

  let currentSearch = '';

  // --- Systemstatus-Prüfung ---
  async function checkSystemStatus() {
    statusIndicator.textContent = 'Wird geprüft...';
    statusIndicator.className = 'status-indicator checking';
    systemErrorsList.innerHTML = ''; // Alte Fehler löschen

    try {
      const response = await fetch(`${SERVERLESS_API_URL}?check_status=true`);
      const result = await response.json();

      if (result.status === 'Online') {
        statusIndicator.textContent = 'Online';
        statusIndicator.className = 'status-indicator online';
      } else {
        statusIndicator.textContent = 'Offline / Probleme';
        statusIndicator.className = 'status-indicator offline';
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach(err => {
            const li = document.createElement('li');
            li.textContent = err;
            systemErrorsList.appendChild(li);
          });
        }
      }
    } catch (error) {
      console.error("Fehler beim Abrufen des Systemstatus:", error);
      statusIndicator.textContent = 'Fehler (Konnte nicht prüfen)';
      statusIndicator.className = 'status-indicator error';
      const li = document.createElement('li');
      li.textContent = `Verbindungsfehler: ${error.message}`;
      systemErrorsList.appendChild(li);
    }
  }

  // --- Torrent-Suche über das Serverless Backend ---
  async function fetchTorrents(query, targetContainer) {
    try {
      showLoading(targetContainer, query);
      
      const response = await fetch(`${SERVERLESS_API_URL}?q=${encodeURIComponent(query)}`);
      const result = await response.json(); // Backend gibt immer JSON zurück

      if (response.ok) {
        if (result.data) {
          return result.data;
        } else if (result.message === "Keine Ergebnisse gefunden.") {
          return []; // Backend hat keine Ergebnisse, aber erfolgreich geantwortet
        } else {
            // Unerwartetes erfolgreiches Ergebnis
            throw new Error(`Unerwartete API-Antwort: ${JSON.stringify(result)}`);
        }
      } else {
        // Fehler vom Backend erhalten (z.B. 400, 500, 503)
        throw new Error(result.error || `Serverfehler: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('API Error in fetchTorrents:', error);
      showError(`Fehler bei der Suche: ${error.message || "Unbekannter Fehler."}`);
      return null; // Gibt null zurück, um anzuzeigen, dass ein Fehler aufgetreten ist
    } finally {
      const loader = targetContainer.querySelector('.loader-wrapper');
      if (loader) {
        loader.remove();
      }
    }
  }

  // Ergebnisse anzeigen mit Fade-In Animation
  function displayTorrents(data, container) {
    Array.from(container.children).forEach(child => {
      if (child.classList.contains('torrent-card') || child.classList.contains('placeholder')) {
        child.classList.add('fade-out');
        child.addEventListener('animationend', () => child.remove(), { once: true });
      }
    });

    if (!data || data.length === 0) {
      setTimeout(() => {
        container.innerHTML = `
          <div class="placeholder fade-in">
            <p>Keine Ergebnisse gefunden für "${currentSearch || searchInput.value.trim()}".</p>
          </div>
        `;
      }, 200); 
      return;
    }
    
    setTimeout(() => {
      container.innerHTML = data.map(torrent => `
        <div class="torrent-card fade-in">
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
    }, 200);
  }

  // Hilfsfunktionen
  function formatSize(bytes) {
    if (bytes === undefined || bytes === null || isNaN(bytes)) return '0 MB';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
  }

  function showLoading(container, queryText) {
    Array.from(container.children).forEach(child => {
      child.classList.add('fade-out');
      child.addEventListener('animationend', () => child.style.display = 'none', { once: true });
    });

    const loaderWrapper = document.createElement('div');
    loaderWrapper.classList.add('loader-wrapper', 'fade-in');
    loaderWrapper.innerHTML = `
      <div class="loader"></div>
      <p>${queryText ? `Suche nach "${queryText}"...` : 'Inhalte werden geladen...'}</p>
    `;
    container.innerHTML = '';
    container.appendChild(loaderWrapper);
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorModal.classList.add('is-visible');
  }

  function hideError() {
    errorModal.classList.remove('is-visible');
  }

  // Event-Listener für den Suchen-Button
  searchBtn.addEventListener('click', executeSearch);
  
  // Event-Listener für die Enter-Taste im Suchfeld
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      executeSearch();
    }
  });

  // Event-Listener für den "OK"-Button im Fehler-Modal (jetzt kein Retry, da Fehler spezifischer sind)
  retryBtn.addEventListener('click', () => {
    hideError();
  });

  // Hauptsuchfunktion
  async function executeSearch() {
    const query = searchInput.value.trim();
    if (!query) {
      displayTorrents([], resultsContainer);
      return;
    }
    
    currentSearch = query;
    const data = await fetchTorrents(query, resultsContainer);
    
    if (data !== null) { // Nur rendern, wenn Daten empfangen wurden (nicht null bei fatalem Fehler)
      displayTorrents(data, resultsContainer);
    }
  }

  // Initialisierung: Systemstatus prüfen und Start-Placeholder anzeigen
  checkSystemStatus();
  resultsContainer.innerHTML = `
    <div class="placeholder fade-in">
      <p>Gib einen Suchbegriff ein, um Ergebnisse zu sehen.</p>
    </div>
  `;

  // Stellt sicher, dass der Footer am unteren Rand bleibt
  function adjustFooterPosition() {
    const contentHeight = document.querySelector('.content-wrapper').offsetHeight;
    const windowHeight = window.innerHeight;
    const footerHeight = mainFooter.offsetHeight;
    if (contentHeight + footerHeight < windowHeight) {
      mainFooter.style.position = 'fixed';
      mainFooter.style.bottom = '0';
      mainFooter.style.left = '0';
      mainFooter.style.width = '100%';
    } else {
      mainFooter.style.position = 'static';
    }
  }

  adjustFooterPosition();
  window.addEventListener('resize', adjustFooterPosition);
});
