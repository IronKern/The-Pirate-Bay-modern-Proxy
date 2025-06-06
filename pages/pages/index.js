import { useState } from "react";
import TorrentCard from "../components/TorrentCard";

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    const res = await fetch(`/api/search?q=${query}`);
    setResults(await res.json());
  };

  return (
    <div className="dark:bg-gray-900 min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 dark:text-white">🏴‍☠️ Pirate Proxy</h1>
        <div className="flex gap-2 mb-8">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suche wie auf The Pirate Bay..."
            className="flex-1 p-2 rounded border dark:bg-gray-800 dark:text-white"
          />
          <button 
            onClick={handleSearch}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Suchen
          </button>
        </div>
        <div className="space-y-4">
          {results.map((torrent) => (
            <TorrentCard key={torrent.id} torrent={torrent} />
          ))}
        </div>
      </div>
    </div>
  );
}
