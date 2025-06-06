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

  // ##########################################################################
  // !!! WICHTIG: HIER MUSST DU DIE URL DEINES DEPLOYTEN SERVERLESS BACKENDS EINTRAGEN !!!
  // Beispiel: 'https://dein-projekt.vercel.app/api/search'
  const SERVERLESS_API_URL = 'DEINE_SERVERLESS_BACKEND_URL/api/search'; 
  // ##########################################################################

  let currentSearch = '';

  // --- Systemstatus-Prüfung ---
  async function checkSystemStatus() {
    console.log('Starte Systemstatus-Prüfung...');
    statusIndicator.textContent = 'Wird geprüft...';
    statusIndicator.className = 'status-indicator checking';
    systemErrorsList.innerHTML = ''; // Alte Fehler löschen

    try {
      const response = await fetch(`${SERVERLESS_API_URL}?check_status=true`);
      const result = await response.json();
      console.log('Systemstatus-Backend-Antwort:', result);

      if (response.ok) { // Überprüfe den HTTP-Status des Backends
        if (result.status === 'Online') {
          statusIndicator.textContent = 'Online';
          statusIndicator.className = 'status-indicator online';
          systemErrorsList.innerHTML = ''; // Sicherstellen, dass keine alten Fehler mehr da sind
        } else {
          statusIndicator.textContent = 'Offline / Probleme';
          statusIndicator.className = 'status-indicator offline';
          if (result.errors && result.errors.length > 0) {
            result.errors.forEach(err => {
              const li = document.createElement('li');
              li.textContent = err;
              systemErrorsList.appendChild(li);
            });
          } else {
            const li = document.createElement('li');
            li.textContent = 'Unbekanntes Problem bei den externen APIs.';
            systemErrorsList.appendChild(li);
          }
        }
      } else {
        // Backend hat einen Fehler-HTTP-Status zurückgegeben (z.B. 500)
        throw new Error(`Backend meldet Fehler: ${result.error || response.statusText}`);
      }
    } catch (error) {
      console.error("Fehler beim Abrufen des Systemstatus:", error);
      statusIndicator.textContent = 'Fehler (Konnte nicht prüfen)';
      statusIndicator.className = 'status-indicator error';
      systemErrorsList.innerHTML = ''; // Alte Fehler löschen
      const li = document.createElement('li');
      li.textContent = `Verbindungsfehler oder Backend-Problem: ${error.message}`;
      systemErrorsList.appendChild(li);
    }
  }

  // --- Torrent-Suche über das Serverless Backend ---
  async function fetchTorrents(query, targetContainer) {
    console.log(`Starte Torrent-Suche für: "${query}"`);
    try {
      showLoading(targetContainer, query);
      
      const response = await fetch(`${SERVERLESS_API_URL}?q=${encodeURIComponent(query)}`);
      const result = await response.json(); // Backend sollte immer JSON zurückgeben
      console.log('Torrent-Backend-Antwort:', result);

      if (response.ok) { // Prüfe HTTP-Status vom Backend (200 OK)
        if (result.data) {
          // Backend gibt ein 'data'-Array zurück
          return result.data;
        } else if (result.message === "Keine Ergebnisse gefunden.") {
          // Backend hat explizit gemeldet, dass keine Ergebnisse gefunden wurden
          return []; 
        } else {
            // Unerwartetes erfolgreiches Ergebnisformat vom Backend
            console.warn("Unerwartetes erfolgreiches Format vom Backend:", result);
            return []; // Behandle es als keine Ergebnisse, um Fehler zu vermeiden
        }
      } else {
        // Backend hat einen Fehler-HTTP-Status zurückgegeben (z.B. 400, 500, 503)
        const errorMsg = result.error || `Serverfehler: ${response.status} ${response.statusText}`;
        console.error("Backend-Fehler (HTTP-Status nicht OK):", errorMsg, result);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('API Error in fetchTorrents:', error);
      showError(`Fehler bei der Suche: ${error.message || "Unbekannter Fehler."}`);
      return null; // Gibt null zurück, um anzuzeigen, dass ein Fehler aufgetreten ist
    } finally {
      // Entferne den Lade-Indikator, egal ob Erfolg oder Fehler
      const loader = targetContainer.querySelector('.loader-wrapper');
      if (loader) {
        loader.remove();
      }
    }
  }

  // Ergebnisse anzeigen mit Fade-In Animation
  function displayTorrents(data, container) {
    console.log('Versuche, Ergebnisse anzuzeigen. Daten:', data);
    // Entferne alte Elemente mit Fade-Out Animation
    if (container.children.length > 0) {
      Array.from(container.children).forEach(child => {
        if (child.classList.contains('torrent-card') || child.classList.contains('placeholder') || child.classList.contains('loader-wrapper')) {
          child.classList.add('fade-out');
          child.addEventListener('animationend', () => child.remove(), { once: true });
        }
      });
    }

    if (!data || data.length === 0) {
      console.log('Keine Daten zum Anzeigen oder Daten leer.');
      setTimeout(() => { // Kurze Verzögerung für Fade-Out
        container.innerHTML = `
          <div class="placeholder fade-in">
            <p>Keine Ergebnisse gefunden für "${currentSearch || searchInput.value.trim()}".</p>
          </div>
        `;
      }, 200); 
      return;
    }
    
    // Füge neue Elemente mit Fade-In Animation hinzu
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
      console.log('Ergebnisse erfolgreich im DOM angezeigt.');
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
    console.log('Zeige Lade-Indikator an.');
    // Auch
