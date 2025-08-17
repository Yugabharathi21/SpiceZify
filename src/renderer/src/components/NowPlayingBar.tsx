import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useAuthStore } from '../stores/useAuthStore';
import FullscreenPlayer from './FullscreenPlayer';
import AlbumCover from './AlbumCover';

export default function NowPlayingBar() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioBRef = useRef<HTMLAudioElement>(null);
  const activeIsARef = useRef(true);
  const isDragging = false;
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const sourceBRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const gainBRef = useRef<GainNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);

  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    repeat,
    play,
    pause,
    next,
    previous,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    setRepeat,
    updateCurrentTime,
    updateDuration,
  } = usePlayerStore();

  const {
    audioQuality,
    crossfade,
    normalizeVolume,
    setAudioQuality,
    setCrossfade,
    setNormalizeVolume,
  } = useSettingsStore();

  const { user } = useAuthStore();

  // helper to build a safe file:// URL from a local path
  const buildFileUrl = (p: string) => {
    // Use custom protocol handled by main process to serve local files.
    // Normalize backslashes to forward slashes and encode the path portion.
    const normalized = p.replace(/\\/g, '/');

    // If this looks like a Windows absolute path (e.g. C:/...), ensure the URL has
    // three slashes after the scheme: spicezify-file:///C:/path
    const isWindowsDrive = /^[A-Za-z]:\//.test(normalized);

    let pathPortion = encodeURI(normalized);
    if (isWindowsDrive) {
      // Ensure a leading slash so the URL pathname becomes '/C:/...'
      if (!pathPortion.startsWith('/')) pathPortion = '/' + pathPortion;
      return `spicezify-file://${pathPortion}`;
    }

    // For POSIX absolute paths (starting with '/'), this will produce spicezify-file:///path
    if (normalized.startsWith('/')) {
      return `spicezify-file://${pathPortion}`;
    }

    // Fallback: prefix with a slash to make an absolute-style pathname
    return `spicezify-file:///${pathPortion}`;
  };

  // Dual-audio element playback and crossfade handling
  useEffect(() => {
    // Attach events to the currently active audio element (A or B)
    const getActive = () => (activeIsARef.current ? audioRef.current : audioBRef.current);
    const audio = getActive();
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (!isDragging) updateCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      updateDuration(audio.duration);
    };

    const handleEnded = () => {
      console.log('🔚 Track ended, repeat mode:', repeat);
      if (repeat === 'one') {
        console.log('🔂 Repeating current track');
        audio.currentTime = 0;
        audio.play();
      } else {
        console.log('⏭️ Moving to next track');
        next();
      }
    };

    const handleError = () => {
      try {
        const err = audio.error;
        console.error('Audio element error:', err, 'readyState:', audio.readyState, 'networkState:', audio.networkState);
      } catch (e) {
        console.error('Error reading audio error object', e);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [isDragging, repeat, next, updateCurrentTime, updateDuration]);

  // Initialize Web Audio API and create sources for both audio elements
  useEffect(() => {
    const a = audioRef.current;
    const b = audioBRef.current;
    if (!a || !b) return;

    if (!audioContextRef.current) {
      const win = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const AcCtor = win.AudioContext ?? win.webkitAudioContext;
      if (!AcCtor) return;
      const ac = new AcCtor();
      audioContextRef.current = ac;

      const src = ac.createMediaElementSource(a);
      const srcB = ac.createMediaElementSource(b);
      sourceRef.current = src;
      sourceBRef.current = srcB;

      const gA = ac.createGain();
      gA.gain.value = 1;
      const gB = ac.createGain();
      gB.gain.value = 0;
      gainRef.current = gA;
      gainBRef.current = gB;

      const compressor = ac.createDynamicsCompressor();
      compressor.threshold?.setValueAtTime(-24, ac.currentTime);
      compressor.knee?.setValueAtTime(30, ac.currentTime);
      compressor.ratio?.setValueAtTime(12, ac.currentTime);
      compressor.attack?.setValueAtTime(0.003, ac.currentTime);
      compressor.release?.setValueAtTime(0.25, ac.currentTime);
      compressorRef.current = compressor;

      src.connect(gA);
      srcB.connect(gB);
      gA.connect(compressor);
      gB.connect(compressor);
      compressor.connect(ac.destination);
    }
  }, []);

  // Simplified audio playback - focus on getting basic playback working first
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    console.log('🎵 Track changed:', currentTrack?.title);

    if (currentTrack) {
      const srcUrl = buildFileUrl(currentTrack.path);
      console.log('🎵 Setting audio src:', srcUrl);
      
      if (audio.src !== srcUrl) {
        audio.preload = 'auto';
        audio.src = srcUrl;
        audio.load(); // Force reload
        
        // Wait for the audio to be ready before playing
        const playWhenReady = () => {
          if (isPlaying) {
            console.log('▶️ Attempting to play after load');
            audio.play().catch(err => {
              console.error('❌ Play failed after load:', err);
            });
          }
        };
        
        audio.addEventListener('canplay', playWhenReady, { once: true });
      } else if (isPlaying) {
        console.log('▶️ Attempting to play (same source)');
        audio.play().catch(err => {
          console.error('❌ Play failed:', err);
        });
      }
    }

    if (!isPlaying && !audio.paused) {
      console.log('⏸️ Pausing');
      audio.pause();
    }
  }, [currentTrack, isPlaying]);

  // Handle volume and mute changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = 0;
      console.log('🔇 Audio muted');
    } else {
      audio.volume = volume;
      console.log('🔊 Volume set to:', volume);
    }
  }, [volume, isMuted]);

  // Crossfade handling - TEMPORARILY DISABLED for basic playback testing
  /* 
  useEffect(() => {
    const ac = audioContextRef.current;
    const gA = gainRef.current;
    const gB = gainBRef.current;
    if (!ac || !gA || !gB) return;

    const prev = prevTrackRef.current;
    if (prev && currentTrack && crossfade > 0) {
      const activeIsA = activeIsARef.current;
      const activeEl = activeIsA ? audioRef.current! : audioBRef.current!;
      const inactiveEl = activeIsA ? audioBRef.current! : audioRef.current!;
      const activeGain = activeIsA ? gA : gB;
      const inactiveGain = activeIsA ? gB : gA;

      const srcUrl = buildFileUrl(currentTrack.path);
      if (inactiveEl.src !== srcUrl) {
        inactiveEl.preload = 'auto';
        inactiveEl.src = srcUrl;
      }

      const fadeDur = Math.min(Math.max(crossfade, 3), 5);
      let started = false;

      const startFade = () => {
        if (started) return;
        started = true;
        const now = ac.currentTime;
        activeGain.gain.cancelScheduledValues(now);
        inactiveGain.gain.cancelScheduledValues(now);
        activeGain.gain.setValueAtTime(activeGain.gain.value, now);
        inactiveGain.gain.setValueAtTime(inactiveGain.gain.value, now);
        activeGain.gain.linearRampToValueAtTime(0, now + fadeDur);
        inactiveGain.gain.linearRampToValueAtTime(1, now + fadeDur);

        inactiveEl.play().catch((e) => console.error('Crossfade inactive play error:', e));

        window.setTimeout(() => {
          try { activeEl.pause(); } catch (e) { console.debug('activeEl.pause ignored', e); }
          activeIsARef.current = !activeIsA;
          prevTrackRef.current = currentTrack ? buildFileUrl(currentTrack.path) : null;
        }, fadeDur * 1000 + 200);
      };

      const onCanPlay = () => startFade();
      const onError = (ev: Event) => {
        console.error('Crossfade load error on inactive element:', ev);
        try { activeEl.pause(); } catch (e) { console.debug('activeEl.pause ignored', e); }
        activeIsARef.current = !activeIsA;
        prevTrackRef.current = currentTrack ? buildFileUrl(currentTrack.path) : null;
      };

      inactiveEl.addEventListener('canplaythrough', onCanPlay, { once: true });
      inactiveEl.addEventListener('loadedmetadata', onCanPlay, { once: true });
      inactiveEl.addEventListener('error', onError, { once: true });

      const fallback = window.setTimeout(() => startFade(), 5000);
      window.setTimeout(() => {
        try { inactiveEl.removeEventListener('canplaythrough', onCanPlay); } catch (e) { console.debug('removeEventListener ignored', e); }
        try { inactiveEl.removeEventListener('loadedmetadata', onCanPlay); } catch (e) { console.debug('removeEventListener ignored', e); }
        try { inactiveEl.removeEventListener('error', onError); } catch (e) { console.debug('removeEventListener ignored', e); }
        clearTimeout(fallback);
      }, (fadeDur + 6) * 1000);
    } else {
      prevTrackRef.current = currentTrack ? buildFileUrl(currentTrack.path) : null;
    }
  }, [currentTrack, crossfade]);
  */

  // Helpers and UI handlers (restored from previous implementation)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60) || 0;
    const secs = Math.floor(seconds % 60) || 0;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const time = percent * duration;
    console.log('🔄 Seeking to:', time);
    
    // Update store state
    seekTo(time);
    
    // Update the actual audio element
    const audio = audioRef.current;
    if (audio && !isNaN(time) && isFinite(time)) {
      audio.currentTime = time;
      console.log('✅ Audio currentTime set to:', audio.currentTime);
    }
  };

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    setVolume(Math.max(0, Math.min(1, percent)));
  };

  const getRepeatIcon = () => {
    switch (repeat) {
      case 'one': return Repeat1;
      case 'all': return Repeat;
      default: return Repeat;
    }
  };

  const cycleAudioQuality = () => {
    if (audioQuality === 'low') setAudioQuality('normal');
    else if (audioQuality === 'normal') setAudioQuality('high');
    else setAudioQuality('low');
  };

  const toggleCrossfade = () => {
    if (crossfade > 0) setCrossfade(0);
    else setCrossfade(4);
  };

  const toggleNormalize = () => {
    setNormalizeVolume(!normalizeVolume);
  };

  const cycleRepeat = () => {
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(repeat);
    const nextIndex = (currentIndex + 1) % modes.length;
    const nextMode = modes[nextIndex];
    console.log('🔁 Repeat mode changed:', repeat, '→', nextMode);
    setRepeat(nextMode);
  };

  // Persist settings to Supabase when user is present
  useEffect(() => {
    if (!user) return;
    const prefs = { audioQuality, crossfade: crossfade > 0, normalizeVolume };
    import('../lib/database').then(({ upsertUserPreferences }) => {
      upsertUserPreferences(user.id, prefs).catch((e) => console.error('Failed to upsert prefs', e));
    });
  }, [user, audioQuality, crossfade, normalizeVolume]);

  if (!currentTrack) {
    return (
      <div className="h-24 bg-card/80 backdrop-blur-xl border-t border-border flex items-center justify-center">
        <p className="text-muted-foreground">Select a song to start playing</p>
      </div>
    );
  }

  const RepeatIcon = getRepeatIcon();

  return (
    <>
      <div className="h-24 bg-card/80 backdrop-blur-xl border-t border-border">
        <audio ref={audioRef} />
        <audio ref={audioBRef} />
        
        {/* Progress Bar */}
        <div className="px-4 pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <div 
              className="flex-1 progress-bar cursor-pointer"
              onClick={handleProgressClick}
            >
              <div 
                className="progress-fill"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
              <div 
                className="progress-thumb"
                style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3">
        {/* Track Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <AlbumCover 
            trackId={currentTrack.id}
            size="medium"
            className="flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm truncate">
              {currentTrack.title}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {currentTrack.artist_name || 'Unknown Artist'}
            </p>
          </div>
          <button className="p-2 hover:bg-muted/50 rounded-full transition-colors">
            <Heart className="w-4 h-4" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Audio quality / Crossfade / Normalize buttons */}
          <button
            onClick={cycleAudioQuality}
            title={`Audio Quality: ${audioQuality}`}
            className={`p-2 rounded-full transition-colors ${audioQuality !== 'normal' ? 'text-primary bg-primary/10' : 'hover:bg-muted/50'}`}
          >
            🎚️
          </button>

          <button
            onClick={toggleCrossfade}
            title={`Crossfade: ${crossfade > 0 ? `${crossfade}s` : 'Off'}`}
            className={`p-2 rounded-full transition-colors ${crossfade > 0 ? 'text-primary bg-primary/10' : 'hover:bg-muted/50'}`}
          >
            🔀
          </button>

          <button
            onClick={toggleNormalize}
            title={`Normalize: ${normalizeVolume ? 'On' : 'Off'}`}
            className={`p-2 rounded-full transition-colors ${normalizeVolume ? 'text-primary bg-primary/10' : 'hover:bg-muted/50'}`}
          >
            🔊
          </button>

          <button
            onClick={() => {
              console.log('🔀 Shuffle clicked, current state:', shuffle);
              toggleShuffle();
            }}
            className={`p-2 rounded-full transition-colors ${
              shuffle ? 'text-primary bg-primary/20' : 'hover:bg-muted/50'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              console.log('⏮️ Previous button clicked');
              previous();
            }}
            className="p-2 hover:bg-muted/50 rounded-full transition-colors"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              console.log(isPlaying ? '⏸️ Pause clicked' : '▶️ Play clicked');
              if (isPlaying) {
                pause();
              } else {
                play();
              }
            }}
            className="p-3 bg-primary hover:bg-primary/90 rounded-full transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-primary-foreground" />
            ) : (
              <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
            )}
          </button>

          <button
            onClick={() => {
              console.log('⏭️ Next button clicked');
              next();
            }}
            className="p-2 hover:bg-muted/50 rounded-full transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <button
            onClick={cycleRepeat}
            title={`Repeat: ${repeat === 'none' ? 'Off' : repeat === 'one' ? 'Track' : 'All'}`}
            className={`p-2 rounded-full transition-colors ${
              repeat !== 'none' ? 'text-primary bg-primary/20' : 'hover:bg-muted/50'
            }`}
          >
            <RepeatIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Volume & Queue */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              onMouseEnter={() => setShowVolumeSlider(true)}
              className="p-2 hover:bg-muted/50 rounded-full transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <AnimatePresence>
              {showVolumeSlider && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 80 }}
                  exit={{ opacity: 0, width: 0 }}
                  className="progress-bar h-1"
                  onClick={handleVolumeChange}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <div 
                    className="progress-fill"
                    style={{ width: `${volume * 100}%` }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => setShowFullscreen(true)}
            className="p-2 hover:bg-muted/50 rounded-full transition-colors"
            title="Fullscreen Player"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      </div>

      {/* Fullscreen Player */}
      <FullscreenPlayer 
        isOpen={showFullscreen}
        onClose={() => setShowFullscreen(false)}
        audioElement={audioRef.current}
      />
    </>
  );
}