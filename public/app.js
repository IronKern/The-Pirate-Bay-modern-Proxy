Document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const resultsContainer = document.getElementById('results');
  const errorModal = document.getElementById('errorModal');
  const errorMessage = document.getElementById('errorMessage');
  const retryBtn = document.getElementById('retryBtn');
  const mainFooter = document.getElementById('main-footer');

  let currentSearch = '';

  // API-Anfrage mit Error-Handling
  async function fetchTorrents(query, targetContainer) {
    let data = null;
    try {
      showLoading(targetContainer, query);
      
      const response = await fetch(`/api/q.php?q=${encodeURIComponent(query)}`); 
      
      if (!response.ok) {
        console.warn(`Primary API failed with status ${response.status}. Trying fallback...`);
        const fallbackResponse = await fetch(`/fallback-api/q.php?q=${encodeURIComponent(query)}`);
        if (!fallbackResponse.ok) {
          throw new Error(`All APIs failed: Primary status ${response.status}, Fallback status ${fallbackResponse.status}`);
        }
        data = await fallbackResponse.json();
      } else {
        data = await response.json();
      }
      
      // Zusätzliche Überprüfung, ob die erhaltenen Daten ein Array sind
      if (!Array.isArray(data)) {
        console.error("API returned non-array data:", data);
        // Wenn die API ein leeres Array zurückgibt oder eine Fehlermeldung als Objekt,
        // kann es sein, dass es keine Ergebnisse gibt oder ein Fehler aufgetreten ist.
        // Wir behandeln dies als "keine Ergebnisse", es sei denn, es ist ein klarer API-Fehler.
        if (data && typeof data === 'object' && data.error) {
            throw new Error(`API-Antwortfehler: ${data.error}`);
        }
        return []; // Gib ein leeres Array zurück, wenn die Daten kein Array sind, aber kein klarer Fehler
      }
      
      return data;
      
    } catch (error) {
      console.error('API Error in fetchTorrents:', error);
      showError(`API-Fehler: ${error.message || "Unbekannter Fehler bei der Datenabfrage."} Bitte versuche es später erneut.`);
      return null; // Gib null zurück, um anzuzeigen, dass ein Fehler aufgetreten ist
    } finally {
      // Lade-Placeholder nach der Anfrage entfernen
      const loader = targetContainer.querySelector('.loader-wrapper');
      if (loader) {
        loader.remove();
      }
    }
  }

  // Ergebnisse anzeigen mit Fade-In Animation
  function displayTorrents(data, container) {
    // Vor dem Hinzufügen neuer Elemente alte entfernen und Fade-Out starten
    // Überprüfe, ob Kinder existieren, bevor du durch sie iterierst
    if (container.children.length > 0) {
      Array.from(container.children).forEach(child => {
        if (child.classList.contains('torrent-card') || child.classList.contains('placeholder')) {
          child.classList.add('fade-out');
          child.addEventListener('animationend', () => child.remove(), { once: true });
        }
      });
    }

    if (!data || data.length === 0) {
      setTimeout(() => { // Verzögerung, um Fade-Out abzuschließen
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
    if (bytes === undefined || bytes === null || isNaN(bytes)) return '0 MB'; // Zusätzliche Prüfung
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

  // Event-Listener für den "Erneut versuchen"-Button im Fehler-Modal
  retryBtn.addEventListener('click', () => {
    hideError();
    if (currentSearch) { // Versuche die letzte Suche erneut
      executeSearch();
    }
  });

  // Hauptsuchfunktion
  async function executeSearch() {
    const query = searchInput.value.trim();
    if (!query) {
      displayTorrents([], resultsContainer); // Zeige leeren Zustand mit Placeholder an
      return;
    }
    
    currentSearch = query;
    const data = await fetchTorrents(query, resultsContainer);
    
    // Nur rendern, wenn Daten empfangen wurden (nicht null bei Fehler)
    if (data !== null) { 
      displayTorrents(data, resultsContainer);
    }
  }

  // Initialisierung: Zeige den Start-Placeholder an
  resultsContainer.innerHTML = `
    <div class="placeholder fade-in">
      <p>Gib einen Suchbegriff ein, um Ergebnisse zu sehen.</p>
    </div>
  `;

  // Stellt sicher, dass der Footer am unteren Rand bleibt
  function adjustFooterPosition() {
    const contentHeight = document.querySelector('.content-wrapper').offsetHeight;
    const windowHeight = window.innerHeight;
    const footerHeight = mainFooter.offsetHeight; // Tatsächliche Höhe des Footers
    if (contentHeight + footerHeight < windowHeight) {
      mainFooter.style.position = 'fixed';
      mainFooter.style.bottom = '0';
      mainFooter.style.left = '0';
      mainFooter.style.width = '100%';
    } else {
      mainFooter.style.position = 'static';
    }
  }

  // Führe die Anpassung beim Laden und bei Größenänderung des Fensters aus
  adjustFooterPosition();
  window.addEventListener('resize', adjustFooterPosition);
});
