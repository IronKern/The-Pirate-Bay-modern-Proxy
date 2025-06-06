export default async function handler(req, res) {
  const { q, cat = "0" } = req.query;
  const url = `https://apibay.org/q.php?q=${encodeURIComponent(q)}&cat=${cat}`;

  try {
    const response = await fetch(url);

    // Prüfen, ob die Antwort von apibay überhaupt OK war
    if (!response.ok) {
      // Loggt den Status-Code, z.B. 403 (Forbidden) oder 503 (Service Unavailable)
      console.error(`APIBay returned an error: ${response.status} ${response.statusText}`);
      throw new Error('APIBay request failed');
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    // DIES IST DER WICHTIGSTE TEIL:
    // Gib den echten Fehler in den Server-Logs aus!
    console.error("Error fetching from apibay:", error); 
    
    res.status(500).json({ 
      error: "Die externe API (apibay.org) ist nicht erreichbar oder blockiert die Anfrage.",
      details: error.message 
    });
  }
}
