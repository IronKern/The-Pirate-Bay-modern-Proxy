export default async function handler(req, res) {
  const { q, cat = "0" } = req.query;
  const url = `https://apibay.org/q.php?q=${encodeURIComponent(q)}&cat=${cat}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "API currently unavailable." });
  }
}
