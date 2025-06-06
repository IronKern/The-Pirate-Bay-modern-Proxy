export default function TorrentCard({ torrent }) {
  return (
    <div className="dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
      <h3 className="font-bold dark:text-white">{torrent.name}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        💾 {Math.round(torrent.size / 1e6)} MB | 
        🔼 {torrent.seeders} | 
        🔽 {torrent.leechers}
      </p>
      <a
        href={`magnet:?xt=urn:btih:${torrent.info_hash}`}
        className="inline-block mt-2 text-blue-500 hover:underline"
      >
        Magnet-Link
      </a>
    </div>
  );
}
