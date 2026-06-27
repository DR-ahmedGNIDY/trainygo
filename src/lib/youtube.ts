/** Extracts the video id from common YouTube URL formats (watch/short/embed/youtu.be). */
export function youtubeVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([\w-]+)/,
    /youtu\.be\/([\w-]+)/,
    /youtube\.com\/shorts\/([\w-]+)/,
    /youtube\.com\/embed\/([\w-]+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

/** Best-quality static thumbnail for a YouTube video (caller should fall back to hqDefault on load error). */
export function youtubeMaxResThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

export function youtubeHqThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
