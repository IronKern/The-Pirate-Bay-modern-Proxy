// Beispiel für eine Node.js Serverless Function (z.B. für Vercel/Netlify Functions)
// Dateiname: api/search.js

import fetch from 'node-fetch'; // 'node-fetch' muss installiert sein (npm install node-fetch)

// Liste mit Backup-APIs
const API_MIRRORS = [
  "https://apibay.org",      // Primäre API
  "https://tpbproxy.xyz",    // Mirror 1
  "https://piratebayproxy.info" // Mirror 2
];

export default async function handler(req, res) {
  // CORS-Header für den Zugriff von jedem Frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { q } = req.query; // Suchbegriff
  const { check_status } = req.query; // Flag, um nur den Status zu prüfen

  let errors = [];
  let systemStatus = 'OK';
  let data = [];
  let successfulMirror = null;

  // --- Systemstatus-Prüfung ---
  if (check_status === 'true') {
    for (const mirror of API_MIRRORS) {
      try {
        const testUrl = `${mirror}/q.php?q=test`; // Einfache Testabfrage
        const response = await fetch(testUrl, { timeout: 5000 }); // 5 Sekunden Timeout
        if (!response.ok) {
          throw new Error(`Status ${response.status} from ${mirror}`);
        }
        // Versuch, JSON zu parsen, um sicherzustellen, dass die API gültige Daten zurückgibt
        await response.json(); 
        successfulMirror = mirror; // Der erste funktionierende Mirror ist unser primärer
        break; // Sobald ein Mirror funktioniert, brechen wir ab
      } catch (e) {
        errors.push(`Fehler bei ${mirror}: ${e.message}`);
      }
    }

    if (errors.length > 0) {
      systemStatus = 'Fehlerhaft';
    } else {
      systemStatus = 'Online';
    }

    return res.status(200).json({ status: systemStatus, errors: errors, primary_api: successfulMirror });
  }

  // --- Torrent-Suche ---
  if (!q) {
    errors.push("Suchanfrage (q) fehlt.");
    return res.status(400).json({ error: "Suchanfrage fehlt.", errors: errors });
  }

  // Versuche jeden Mirror, bis einer funktioniert
  for (const mirror of API_MIRRORS) {
    const url = `${mirror}/q.php?q=${encodeURIComponent(q)}`;
    try {
      const response = await fetch(url, { timeout: 10000 }); // 10 Sekunden Timeout für die Suche
      if (!response.ok) {
        throw new Error(`Status ${response.status} from ${mirror}`);
      }
      const jsonData = await response.json();

      // apibay.org gibt bei "keine Ergebnisse" oft ein leeres Objekt oder String zurück
      // Statt eines Arrays. Das müssen wir abfangen.
      if (Array.isArray(jsonData) && jsonData.length > 0) {
        data = jsonData;
        successfulMirror = mirror;
        break; // Erfolgreich, breche die Schleife ab
      } else if (typeof jsonData === 'object' && Object.keys(jsonData).length === 0) {
          // Leeres Objekt bedeutet oft "keine Ergebnisse", aber keine Fehlfunktion der API selbst.
          data = []; 
          successfulMirror = mirror; // Die API ist erreichbar, nur keine Treffer
          break;
      } else if (typeof jsonData === 'string' && jsonData.trim() === '') {
          data = [];
          successfulMirror = mirror;
          break;
      } else {
          // Unerwartetes Datenformat
          throw new Error(`Unerwartetes Datenformat von ${mirror}`);
      }
    } catch (e) {
      errors.push(`Fehler bei ${mirror}: ${e.message}`);
    }
  }

  if (data.length === 0 && errors.length === API_MIRRORS.length) {
    // Wenn keine Daten gefunden und alle Mirrors Fehler hatten
    systemStatus = 'Offline oder blockiert';
    return res.status(503).json({ 
      error: "Alle externen APIs sind derzeit nicht erreichbar oder blockieren die Anfrage.", 
      details: errors,
      status: systemStatus
    });
  } else if (data.length === 0) {
      // Wenn keine Ergebnisse gefunden, aber mindestens ein Mirror erreichbar war
      return res.status(200).json({ data: [], message: "Keine Ergebnisse gefunden.", primary_api: successfulMirror, status: "Online" });
  } else {
      // Ergebnisse gefunden
      return res.status(200).json({ data: data, primary_api: successfulMirror, status: "Online" });
  }
}
