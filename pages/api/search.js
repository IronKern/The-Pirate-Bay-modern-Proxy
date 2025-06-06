// search.js
// Dies ist der Code für deine Serverless Function, z.B. unter api/search.js

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { q, check_status } = req.query;

  let errors = [];
  let systemStatus = 'Unbekannt';
  let primaryApiUsed = null; // Speichert den Mirror, der erfolgreich war

  // --- 1. Systemstatus-Prüfung ---
  if (check_status === 'true') {
    for (const mirror of API_MIRRORS) {
      try {
        const testUrl = `${mirror}/q.php?q=test_status_check_query`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000); // 7 Sekunden Timeout
        
        const response = await fetch(testUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP-Status ${response.status} von ${mirror}`);
        }
        
        // Versuche, die Antwort als JSON zu parsen.
        // Auch wenn es ein leeres Array/Objekt ist, gilt es als erfolgreich, solange es gültiges JSON ist.
        try {
          await response.json(); 
        } catch (jsonError) {
          throw new Error(`Ungültige JSON-Antwort von ${mirror}: ${jsonError.message}`);
        }
        
        primaryApiUsed = mirror;
        systemStatus = 'Online';
        break; 
      } catch (e) {
        // Fang AbortError separat ab für Timeout
        if (e.name === 'AbortError') {
            errors.push(`Timeout bei ${mirror}: ${e.message}`);
        } else {
            errors.push(`Fehler bei ${mirror}: ${e.message}`);
        }
      }
    }

    if (primaryApiUsed === null) {
      systemStatus = 'Offline / Probleme';
    }

    return res.status(200).json({
      status: systemStatus,
      errors: errors,
      primary_api: primaryApiUsed
    });
  }

  // --- 2. Torrent-Suche ---
  if (!q) {
    return res.status(400).json({ 
      error: "Suchanfrage (q) fehlt. Bitte geben Sie einen Suchbegriff an.",
      status: "Fehler",
      details: "Fehlende Suchanfrage"
    });
  }

  let torrentData = [];
  let searchWasSuccessful = false;

  for (const mirror of API_MIRRORS) {
    const url = `${mirror}/q.php?q=${encodeURIComponent(q)}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 Sekunden Timeout für die Suche
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP-Status ${response.status} von ${mirror}`);
      }

      let jsonData;
      try {
        jsonData = await response.json();
      } catch (jsonError) {
        throw new Error(`Ungültige JSON-Antwort von ${mirror}: ${jsonError.message}`);
      }
      
      // Behandlung verschiedener "keine Ergebnisse" Formate von apibay.org/mirrors
      if (Array.isArray(jsonData)) {
        torrentData = jsonData;
      } else if (typeof jsonData === 'object' && Object.keys(jsonData).length === 0) {
          // Leeres Objekt bedeutet oft "keine Ergebnisse", aber API ist erreichbar
          torrentData = []; 
      } else if (jsonData === false || (typeof jsonData === 'string' && jsonData.trim() === '')) {
          // 'false' oder leerer String bedeutet auch "keine Ergebnisse"
          torrentData = [];
      } else {
          // Unerwartetes, aber gültiges JSON-Format, das wir nicht direkt als Torrent-Array erkennen
          // Könnte ein Fehlerobjekt von der API sein, das aber einen 200er-Status hat
          // Hier können wir Logik hinzufügen, um bestimmte Fehlerobjekte zu erkennen, falls bekannt
          console.warn(`Unerwartetes JSON-Format von ${mirror}, wird als leeres Ergebnis behandelt:`, jsonData);
          torrentData = []; 
      }

      primaryApiUsed = mirror;
      searchWasSuccessful = true;
      break; 
    } catch (e) {
      if (e.name === 'AbortError') {
          errors.push(`Timeout bei ${mirror}: ${e.message}`);
      } else {
          errors.push(`Fehler bei ${mirror}: ${e.message}`);
      }
    }
  }

  if (searchWasSuccessful) {
    return res.status(200).json({ 
      data: torrentData, 
      message: torrentData.length > 0 ? "Ergebnisse gefunden." : "Keine Ergebnisse gefunden.",
      primary_api: primaryApiUsed,
      status: "Online" // Da mindestens ein Mirror erfolgreich war
    });
  } else {
    // Wenn alle Mirrors Fehler geworfen haben
    return res.status(503).json({ 
      error: "Alle externen Torrent-APIs sind derzeit nicht erreichbar oder blockieren die Anfrage.", 
      details: errors,
      status: "Offline / Probleme"
    });
  }
}
