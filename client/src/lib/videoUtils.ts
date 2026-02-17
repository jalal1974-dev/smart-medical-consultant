/**
 * Utility functions for video handling
 */

/**
 * Extract YouTube video ID from various YouTube URL formats
 */
export function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
    /(?:youtube\.com\/embed\/)([^?&\s]+)/,
    /(?:youtu\.be\/)([^?&\s]+)/,
    /(?:youtube\.com\/v\/)([^?&\s]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Check if a URL is a YouTube video
 */
export function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/.test(url);
}

/**
 * Get YouTube thumbnail URL from video URL
 * Returns high quality thumbnail (maxresdefault) with fallback to hqdefault
 */
export function getYouTubeThumbnail(url: string): string | null {
  const videoId = getYouTubeId(url);
  if (!videoId) return null;
  
  // Try maxresdefault first (1280x720), fallback to hqdefault (480x360)
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

/**
 * Get fallback thumbnail if maxresdefault doesn't exist
 */
export function getYouTubeThumbnailFallback(url: string): string | null {
  const videoId = getYouTubeId(url);
  if (!videoId) return null;
  
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Get thumbnail URL with automatic YouTube detection
 * If thumbnailUrl is provided, use it. Otherwise, try to extract from YouTube URL.
 */
export function getThumbnailUrl(videoUrl: string, thumbnailUrl?: string | null): string {
  // If explicit thumbnail is provided, use it
  if (thumbnailUrl) return thumbnailUrl;
  
  // If it's a YouTube video, generate thumbnail URL
  if (isYouTubeUrl(videoUrl)) {
    const ytThumbnail = getYouTubeThumbnail(videoUrl);
    if (ytThumbnail) return ytThumbnail;
  }
  
  // Fallback to placeholder
  return '/placeholder-video.jpg';
}
