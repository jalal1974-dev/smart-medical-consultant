import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

interface VideoPlayerProps {
  url: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  autoPlay?: boolean;
  className?: string;
}

export interface VideoPlayerRef {
  currentTime: number;
  duration: number;
  paused: boolean;
  play: () => void;
  pause: () => void;
}

/**
 * Universal video player that handles:
 * - YouTube videos (uses iframe embed)
 * - Direct video files (mp4, webm, etc. - uses HTML5 video)
 */
export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  ({ url, onPlay, onPause, onEnded, onTimeUpdate, autoPlay = false, className = "" }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    
    // Detect if URL is a YouTube video
    const isYouTube = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i.test(url);
    
    // Extract YouTube video ID
    const getYouTubeId = (url: string): string | null => {
      const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
      return match ? match[1] : null;
    };
    
    const youtubeId = isYouTube ? getYouTubeId(url) : null;
    const youtubeEmbedUrl = youtubeId 
      ? `https://www.youtube.com/embed/${youtubeId}?autoplay=${autoPlay ? 1 : 0}&rel=0&modestbranding=1`
      : null;
    
    // Expose video controls through ref
    useImperativeHandle(ref, () => ({
      get currentTime() {
        return videoRef.current?.currentTime || 0;
      },
      get duration() {
        return videoRef.current?.duration || 0;
      },
      get paused() {
        return videoRef.current?.paused ?? true;
      },
      play: () => {
        videoRef.current?.play();
      },
      pause: () => {
        videoRef.current?.pause();
      },
    }));
    
    // Handle video events for HTML5 video
    useEffect(() => {
      const video = videoRef.current;
      if (!video || isYouTube) return;
      
      const handlePlay = () => onPlay?.();
      const handlePause = () => onPause?.();
      const handleEnded = () => onEnded?.();
      const handleTimeUpdate = () => {
        if (onTimeUpdate && video) {
          onTimeUpdate(video.currentTime, video.duration);
        }
      };
      
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('ended', handleEnded);
      video.addEventListener('timeupdate', handleTimeUpdate);
      
      return () => {
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('ended', handleEnded);
        video.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }, [onPlay, onPause, onEnded, onTimeUpdate, isYouTube]);
    
    if (isYouTube && youtubeEmbedUrl) {
      return (
        <iframe
          ref={iframeRef}
          src={youtubeEmbedUrl}
          className={`w-full h-full ${className}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video player"
        />
      );
    }
    
    // For direct video files (mp4, webm, etc.)
    return (
      <video
        ref={videoRef}
        src={url}
        controls
        autoPlay={autoPlay}
        className={`w-full h-full ${className}`}
      >
        Your browser does not support the video tag.
      </video>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
