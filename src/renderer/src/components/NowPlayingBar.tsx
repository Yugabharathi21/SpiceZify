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
import { upsertUserPreferences } from '../lib/supabase';

export default function NowPlayingBar() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const prevTrackRef = useRef<string | null>(null);
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
    const normalized = p.replace(/\\/g, '/');
    const prefix = normalized.startsWith('/') ? '' : '/';
    return encodeURI(`file://${prefix}${normalized}`);
  };

  // Audio element event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (!isDragging) {
        updateCurrentTime(audio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      updateDuration(audio.duration);
    };

    const handleEnded = () => {
      if (repeat === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else {
        next();
      }
    };

    const handleError = () => {
      try {
        // Log detailed media error info
        // @ts-ignore
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

  // Sync audio playback with store state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentTrack) {
      const srcUrl = buildFileUrl(currentTrack.path);
      if (audio.src !== srcUrl) {
        console.debug('Assigning audio.src =', srcUrl);
        audio.preload = 'auto';
        audio.src = srcUrl;
        console.debug('audio.readyState after src assign:', audio.readyState, 'audioContext.state:', audioContextRef.current?.state);
      }
      
      if (isPlaying) {
        const playAudio = async () => {
          try {
            console.debug('Attempting to play audio. audio.src:', audio.src, 'readyState:', audio.readyState, 'audioContext.state:', audioContextRef.current?.state);
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
              console.debug('Resuming suspended AudioContext...');
              await audioContextRef.current.resume();
              console.debug('AudioContext state after resume:', audioContextRef.current.state);
            }
            const p = audio.play();
            if (p && typeof p.then === 'function') {
              await p;
            }
            console.debug('Play promise resolved. audio.paused:', audio.paused, 'currentTime:', audio.currentTime);
          } catch (err) {
            console.error('Audio play failed:', err, 'audio.error:', audio.error);
          }
        };
        playAudio();
      } else {
        audio.pause();
      }
    }
  }, [currentTrack, isPlaying]);

  // Initialize Web Audio API when audio element mounts
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audioContextRef.current) {
      const win = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const AcCtor = win.AudioContext ?? win.webkitAudioContext;
      if (!AcCtor) return;
      const ac = new AcCtor();
      audioContextRef.current = ac;
      const source = ac.createMediaElementSource(audio);
      sourceRef.current = source;

      const gain = ac.createGain();
      gain.gain.value = 1;
      gainRef.current = gain;

      const compressor = ac.createDynamicsCompressor();
      compressor.threshold?.setValueAtTime(-24, ac.currentTime);
      compressor.knee?.setValueAtTime(30, ac.currentTime);
      compressor.ratio?.setValueAtTime(12, ac.currentTime);
      compressor.attack?.setValueAtTime(0.003, ac.currentTime);
      compressor.release?.setValueAtTime(0.25, ac.currentTime);
      compressorRef.current = compressor;

      // Connect: source -> compressor (if enabled) -> gain -> destination
      source.connect(compressor);
      compressor.connect(gain);
      gain.connect(ac.destination);
    }

    return () => {
      // keep context alive for the session; optional cleanup could close it here
    };
  }, []);

  // Sync volume
  useEffect(() => {
    const audio = audioRef.current;
    const gain = gainRef.current;
    if (gain) {
      const target = isMuted ? 0 : volume;
      gain.gain.value = target;
    } else if (audio) {
      audio.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Apply normalize setting to compressor bypass
  useEffect(() => {
    const compressor = compressorRef.current;
    if (!compressor) return;
    if (normalizeVolume) {
      compressor.threshold?.setValueAtTime(-20, audioContextRef.current!.currentTime);
      compressor.ratio?.setValueAtTime(8, audioContextRef.current!.currentTime);
    } else {
      compressor.threshold?.setValueAtTime(-100, audioContextRef.current!.currentTime);
      compressor.ratio?.setValueAtTime(1, audioContextRef.current!.currentTime);
    }
  }, [normalizeVolume]);

  // Apply audio quality by adjusting playbackRate as a simple simulation
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
  // Map stored quality to simulated playbackRate
  if (audioQuality === 'low') audio.playbackRate = 0.95;
  else if (audioQuality === 'normal') audio.playbackRate = 1;
  else if (audioQuality === 'high') audio.playbackRate = 1.02;
  else audio.playbackRate = 1;
  }, [audioQuality]);

  // Persist settings to Supabase when user is present
  useEffect(() => {
    if (!user) return;
    const prefs = { audioQuality, crossfade: crossfade > 0, normalizeVolume };
    // fire-and-forget
    upsertUserPreferences(user.id, prefs).catch(console.error);
  }, [user, audioQuality, crossfade, normalizeVolume]);

  // Handlers for UI controls
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

  // Sync current time
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && Math.abs(audio.currentTime - currentTime) > 1) {
      audio.currentTime = currentTime;
    }
  }, [currentTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const time = percent * duration;
    seekTo(time);
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

  const cycleRepeat = () => {
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(repeat);
    const nextIndex = (currentIndex + 1) % modes.length;
    setRepeat(modes[nextIndex]);
  };

  // Crossfade handling when currentTrack changes
  useEffect(() => {
    const ac = audioContextRef.current;
    const gain = gainRef.current;
    const audio = audioRef.current;
    if (!ac || !gain || !audio) return;

    const prev = prevTrackRef.current;
    if (prev && currentTrack && crossfade > 0) {
          const nextAudio = new Audio(buildFileUrl(currentTrack.path));
      nextAudio.preload = 'auto';
      const nextSource = ac.createMediaElementSource(nextAudio);
      const nextGain = ac.createGain();
      nextGain.gain.value = 0;
      nextSource.connect(nextGain);
      nextGain.connect(ac.destination);

      const fadeDur = Math.min(Math.max(crossfade, 3), 5);
      const now = ac.currentTime;

      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + fadeDur);

      nextGain.gain.setValueAtTime(0, now);
      nextGain.gain.linearRampToValueAtTime(1, now + fadeDur);

      nextAudio.play().catch(console.error);

      window.setTimeout(() => {
        audio.pause();
        audio.src = buildFileUrl(currentTrack.path);
        audio.play().catch((err) => console.error('Audio play failed after crossfade:', err));
        nextSource.disconnect();
        nextGain.disconnect();
      }, fadeDur * 1000 + 200);
    }

  prevTrackRef.current = currentTrack ? buildFileUrl(currentTrack.path) : null;
  }, [currentTrack, crossfade]);

  if (!currentTrack) {
    return (
      <div className="h-24 bg-card/80 backdrop-blur-xl border-t border-border flex items-center justify-center">
        <p className="text-muted-foreground">Select a song to start playing</p>
      </div>
    );
  }

  const RepeatIcon = getRepeatIcon();

  return (
    <div className="h-24 bg-card/80 backdrop-blur-xl border-t border-border">
      <audio ref={audioRef} />
      
      {/* Progress Bar */}
      <div className="px-4 pt-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <div 
            className="flex-1 progress-bar"
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
          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
            {currentTrack.cover ? (
              <img 
                src={currentTrack.cover} 
                alt="Album art"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 bg-muted-foreground/20 rounded" />
            )}
          </div>
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
            onClick={toggleShuffle}
            className={`p-2 rounded-full transition-colors ${
              shuffle ? 'text-primary bg-primary/20' : 'hover:bg-muted/50'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={previous}
            className="p-2 hover:bg-muted/50 rounded-full transition-colors"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={isPlaying ? pause : () => play()}
            className="p-3 bg-primary hover:bg-primary/90 rounded-full transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-primary-foreground" />
            ) : (
              <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
            )}
          </button>

          <button
            onClick={next}
            className="p-2 hover:bg-muted/50 rounded-full transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <button
            onClick={cycleRepeat}
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

          <button className="p-2 hover:bg-muted/50 rounded-full transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}