// search.js
// Dies ist der Code für deine Serverless Function, z.B. unter api/search.js

// Importiere 'node-fetch', wenn du es in einer Node.js Serverless-Umgebung ausführst,
// die es nicht standardmäßig bereitstellt (z.B. AWS Lambda).
// Auf Plattformen wie Vercel/Netlify ist 'fetch' oft global verfügbar.
// Wenn du Fehlermeldungen über 'fetch' bekommst, installiere es: npm install node-fetch
import fetch from 'node-fetch'; 

// Liste mit Backup-APIs für die Torrent-Suche
const API_MIRRORS = [
  "https://apibay.org",      // Primäre API
  "https://tpbproxy.xyz",    // Mirror 1
  "https://piratebayproxy.info", // Mirror 2
  // Füge hier bei Bedarf weitere Mirrors hinzu
];

export default async function handler(req, res) {
  // --- CORS-Header setzen ---
  // Erlaubt Anfragen von jeder Domain. Wichtig für Cross-Origin-Anfragen vom Frontend.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, POST'); // Erlaube GET, OPTIONS, POST
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Bei OPTIONS-Anfragen (Preflight-Checks von Browsern) einfach antworten
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { q, check_status } = req.query; // q für Suchbegriff, check_status für Statusprüfung

  let errors = [];
  let systemStatus = 'Unbekannt';
  let successfulMirror = null;

  // --- 1. Systemstatus-Prüfung (wenn check_status=true in der Anfrage) ---
  if (check_status === 'true') {
    for (const mirror of API_MIRRORS) {
      try {
        // Versuche eine einfache Anfrage an den Mirror, um dessen Erreichbarkeit zu testen
        // Füge einen Timeout hinzu, um blockierte Anfragen zu vermeiden
        const testUrl = `${mirror}/q.php?q=test_query_for_status`; // Nutze einen harmlosen Suchbegriff
        const response = await fetch(testUrl, { timeout: 7000 }); // 7 Sekunden Timeout

        // Prüfen, ob die Antwort im HTTP-Bereich 200-299 liegt
        if (!response.ok) {
          throw new Error(`HTTP-Status ${response.status} von ${mirror}`);
        }
        
        // Versuche, die Antwort als JSON zu parsen, um sicherzustellen, dass die API gültige Daten zurückgibt.
        // Auch wenn es ein leeres Array oder Objekt ist, gilt es als erfolgreich.
        const testData = await response.json(); 
        
        successfulMirror = mirror; // Dieser Mirror funktioniert
        systemStatus = 'Online';
        break; // Erster funktionierender Mirror gefunden, Schleife beenden
      } catch (e) {
        errors.push(`Fehler bei ${mirror}: ${e.message}`);
      }
    }

    if (successfulMirror === null) {
      systemStatus = 'Offline / Probleme'; // Keiner der Mirrors war erreichbar
    }

    return res.status(200).json({
      status: systemStatus,
      errors: errors,
      primary_api: successfulMirror // Welcher Mirror als erster erfolgreich war (oder null)
    });
  }

  // --- 2. Torrent-Suche (wenn q vorhanden ist) ---
  if (!q) {
    return res.status(400).json({ 
      error: "Suchanfrage (q) fehlt. Bitte geben Sie einen Suchbegriff an.",
      status: "Fehler",
      details: "Fehlende Suchanfrage"
    });
  }

  let torrentData = [];
  let searchSuccess = false;

  for (const mirror of API_MIRRORS) {
    const url = `${mirror}/q.php?q=${encodeURIComponent(q)}`;
    try {
      const response = await fetch(url, { timeout: 15000 }); // 15 Sekunden Timeout für die Suche
      
      if (!response.ok) {
        throw new Error(`HTTP-Status ${response.status} von ${mirror}`);
      }

      const jsonData = await response.json();

      // apibay.org gibt bei "keine Ergebnisse" oft ein leeres Objekt, einen leeren String oder `false` zurück
      // anstatt eines leeren Arrays. Das müssen wir abfangen.
      if (Array.isArray(jsonData)) {
        torrentData = jsonData;
      } else if (typeof jsonData === 'object' && Object.keys(jsonData).length === 0 || jsonData === false || (typeof jsonData === 'string' && jsonData.trim() === '')) {
          // Die API war erreichbar, aber es gab keine Ergebnisse.
          torrentData = []; 
      } else {
          // Unerwartetes Datenformat
          throw new Error(`Unerwartetes Datenformat von ${mirror}`);
      }

      successfulMirror = mirror;
      searchSuccess = true;
      break; // Erfolgreich Daten abgerufen (auch wenn leer), breche die Schleife ab
    } catch (e) {
      errors.push(`Fehler bei ${mirror}: ${e.message}`);
      // Wenn ein Mirror einen Fehler wirft, versuchen wir den nächsten
    }
  }

  if (searchSuccess) {
    return res.status(200).json({ 
      data: torrentData, 
      message: torrentData.length > 0 ? "Ergebnisse gefunden." : "Keine Ergebnisse gefunden.",
      primary_api: successfulMirror,
      status: "Online"
    });
  } else {
    // Wenn alle Mirrors Fehler geworfen haben und keine Daten gefunden wurden
    return res.status(503).json({ 
      error: "Alle externen Torrent-APIs sind derzeit nicht erreichbar oder blockieren die Anfrage.", 
      details: errors,
      status: "Offline / Probleme"
    });
  }
}
