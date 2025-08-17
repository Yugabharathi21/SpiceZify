import { useState, useEffect } from 'react';

interface AlbumCoverProps {
  trackId: number;
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'custom';
}

export default function AlbumCover({ trackId, className = '', size = 'medium' }: AlbumCoverProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadCover = async () => {
      try {
        setIsLoading(true);
        const cover = await window.electronAPI.getCoverForTrack(trackId);
        if (isMounted) {
          setCoverUrl(cover);
        }
      } catch (error) {
        console.warn('Failed to load album cover for track', trackId, ':', (error as Error).message);
        if (isMounted) {
          setCoverUrl(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (trackId > 0) {
      loadCover();
    } else {
      setIsLoading(false);
      setCoverUrl(null);
    }

    return () => {
      isMounted = false;
    };
  }, [trackId]);

  const getSizeClasses = () => {
    switch (size) {
      case 'small': return 'w-8 h-8';
      case 'medium': return 'w-12 h-12';
      case 'large': return 'w-16 h-16';
      case 'custom': return ''; // Allow custom sizing via className
      default: return 'w-12 h-12';
    }
  };

  return (
    <div className={`${getSizeClasses()} bg-muted rounded-lg overflow-hidden flex items-center justify-center ${className}`}>
      {isLoading ? (
        <div className="w-full h-full bg-muted animate-pulse" />
      ) : coverUrl ? (
        <img 
          src={coverUrl} 
          alt="Album cover" 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-6 h-6 bg-muted-foreground/20 rounded" />
      )}
    </div>
  );
}
