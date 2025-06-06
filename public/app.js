// Dark Mode Toggle
document.getElementById('themeToggle').addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('darkMode', document.body.classList.contains('dark'));
});

// API-Anfrage
async function searchTorrents(query) {
  const response = await fetch(`/api/q.php?q=${encodeURIComponent(query)}`);
  return await response.json();
}

// Ergebnisse anzeigen
document.getElementById('searchBtn').addEventListener('click', async () => {
  const query = document.getElementById('searchInput').value;
  const resultsContainer = document.getElementById('results');
  
  resultsContainer.innerHTML = '<p class="text-center py-8">Suche läuft...</p>';
  
  try {
    const data = await searchTorrents(query);
    
    if (data.length === 0) {
      resultsContainer.innerHTML = '<p class="text-center py-8">Keine Ergebnisse gefunden.</p>';
      return;
    }

    resultsContainer.innerHTML = data.map(torrent => `
      <div class="torrent-card bg-gray-800 p-4 rounded-xl border border-purple-900 hover:border-purple-500 transition-colors">
        <h3 class="font-bold text-purple-400">${torrent.name}</h3>
        <div class="flex gap-4 mt-2 text-sm text-gray-400">
          <span>💾 ${(torrent.size / 1024 / 1024).toFixed(2)} MB</span>
          <span>🔼 ${torrent.seeders || 0} Seeders</span>
          <span>🔽 ${torrent.leechers || 0} Leechers</span>
        </div>
        <a
          href="magnet:?xt=urn:btih:${torrent.info_hash}"
          class="mt-3 inline-block text-purple-500 hover:text-purple-300"
        >
          Magnet-Link
        </a>
      </div>
    `).join('');
    
  } catch (error) {
    resultsContainer.innerHTML = `
      <p class="text-center py-8 text-red-400">
        Fehler: ${error.message}<br>
        <button onclick="window.location.reload()" class="mt-2 px-4 py-2 bg-purple-600 rounded">
          Erneut versuchen
        </button>
      </p>
    `;
  }
});