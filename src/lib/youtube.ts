const VIDEO_ID_RE = /^[\w-]{11}$/;

/** Extracts the video id from any common YouTube URL format (watch/short/embed/live/youtu.be, any query param order, www/m/no-subdomain, youtube-nocookie.com). */
export function youtubeVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\.|^m\./, '');
  if (!/(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/.test(host)) return null;

  // youtu.be/VIDEO_ID
  if (host === 'youtu.be') {
    const id = parsed.pathname.split('/').filter(Boolean)[0];
    return id && VIDEO_ID_RE.test(id) ? id : null;
  }

  // youtube.com/watch?v=VIDEO_ID (v can be anywhere in the query string)
  const vParam = parsed.searchParams.get('v');
  if (vParam && VIDEO_ID_RE.test(vParam)) return vParam;

  // youtube.com/shorts/VIDEO_ID, /embed/VIDEO_ID, /live/VIDEO_ID, /v/VIDEO_ID
  const segments = parsed.pathname.split('/').filter(Boolean);
  const prefixIdx = segments.findIndex((s) => ['shorts', 'embed', 'live', 'v'].includes(s));
  if (prefixIdx !== -1 && segments[prefixIdx + 1] && VIDEO_ID_RE.test(segments[prefixIdx + 1])) {
    return segments[prefixIdx + 1];
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
