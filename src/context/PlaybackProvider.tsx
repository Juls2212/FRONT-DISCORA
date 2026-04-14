import {
  useCallback,
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { resolveYouTubeAudioStream } from '../services/youtubeImport';
import { EqualizerState, PlaybackContext, Song } from '../types';

type PlaybackStore = {
  canGoNext: boolean;
  canGoPrevious: boolean;
  currentTime: number;
  equalizer: EqualizerState;
  isFullPlayerOpen: boolean;
  isPlaying: boolean;
  playbackContext: PlaybackContext | null;
  playbackDuration: number;
  playbackQueue: Song[];
  selectedTrack: Song | null;
  volume: number;
  closeFullPlayer: () => void;
  nextTrack: () => void;
  openFullPlayer: () => void;
  playTrack: (song: Song, context: PlaybackContext, queue?: Song[]) => void;
  previousTrack: () => void;
  setEqualizer: (equalizer: EqualizerState) => void;
  setVolume: (volume: number) => void;
  seekTo: (time: number) => void;
  syncLibrarySongs: (songs: Song[]) => void;
  togglePlayback: () => void;
};

const PlaybackStoreContext = createContext<PlaybackStore | null>(null);

export function PlaybackProvider({ children }: PropsWithChildren) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const trebleFilterRef = useRef<BiquadFilterNode | null>(null);
  const selectedTrackRef = useRef<Song | null>(null);
  const playbackQueueRef = useRef<Song[]>([]);
  const playbackContextRef = useRef<PlaybackContext | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Song | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackContext, setPlaybackContext] = useState<PlaybackContext | null>(null);
  const [playbackQueue, setPlaybackQueue] = useState<Song[]>([]);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [volume, setVolumeState] = useState(0.72);
  const [equalizer, setEqualizerState] = useState<EqualizerState>({
    bass: 62,
    mid: 48,
    treble: 57,
  });

  const currentTrackIndex = useMemo(() => {
    if (!selectedTrack) {
      return -1;
    }

    return playbackQueue.findIndex((song) => song.id === selectedTrack.id);
  }, [playbackQueue, selectedTrack]);

  const canGoPrevious = currentTrackIndex > 0;
  const canGoNext = currentTrackIndex >= 0 && currentTrackIndex < playbackQueue.length - 1;

  useEffect(() => {
    selectedTrackRef.current = selectedTrack;
  }, [selectedTrack]);

  useEffect(() => {
    playbackQueueRef.current = playbackQueue;
  }, [playbackQueue]);

  useEffect(() => {
    playbackContextRef.current = playbackContext;
  }, [playbackContext]);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.crossOrigin = 'anonymous';

    try {
      const audioWindow = window as Window &
        typeof globalThis & {
          webkitAudioContext?: typeof AudioContext;
        };
      const AudioContextClass = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;

      if (AudioContextClass) {
        const audioContext = new AudioContextClass();
        const mediaSource = audioContext.createMediaElementSource(audio);
        const bassFilter = audioContext.createBiquadFilter();
        const midFilter = audioContext.createBiquadFilter();
        const trebleFilter = audioContext.createBiquadFilter();
        const gainNode = audioContext.createGain();

        bassFilter.type = 'lowshelf';
        bassFilter.frequency.value = 200;

        midFilter.type = 'peaking';
        midFilter.frequency.value = 1000;
        midFilter.Q.value = 1;

        trebleFilter.type = 'highshelf';
        trebleFilter.frequency.value = 3000;

        mediaSource.connect(bassFilter);
        bassFilter.connect(midFilter);
        midFilter.connect(trebleFilter);
        trebleFilter.connect(gainNode);
        gainNode.connect(audioContext.destination);

        audioContextRef.current = audioContext;
        mediaSourceRef.current = mediaSource;
        gainNodeRef.current = gainNode;
        bassFilterRef.current = bassFilter;
        midFilterRef.current = midFilter;
        trebleFilterRef.current = trebleFilter;
      } else {
        audio.volume = volume;
      }
    } catch (error) {
      console.error('Discora audio chain setup failed', error);
      audio.volume = volume;
    }

    const handleEnded = () => {
      const currentSong = selectedTrackRef.current;
      const queue = playbackQueueRef.current;

      if (!currentSong) {
        setIsPlaying(false);
        setCurrentTime(0);
        return;
      }

      const currentIndex = queue.findIndex((song) => song.id === currentSong.id);

      if (currentIndex >= 0 && currentIndex < queue.length - 1) {
        setSelectedTrack(queue[currentIndex + 1]);
        setCurrentTime(0);
        setIsPlaying(true);
        return;
      }

      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      console.error('Discora playback error', {
        audioUrl: audio.currentSrc,
        selectedTrack: selectedTrackRef.current,
      });
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setPlaybackDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleLoadedMetadata);

    return () => {
      audio.pause();
      gainNodeRef.current?.disconnect();
      trebleFilterRef.current?.disconnect();
      midFilterRef.current?.disconnect();
      bassFilterRef.current?.disconnect();
      mediaSourceRef.current?.disconnect();
      void audioContextRef.current?.close();
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleLoadedMetadata);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
      return;
    }

    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const mapBandValue = (value: number) => ((value - 50) / 50) * 12;

    if (bassFilterRef.current) {
      bassFilterRef.current.gain.value = mapBandValue(equalizer.bass);
    }

    if (midFilterRef.current) {
      midFilterRef.current.gain.value = mapBandValue(equalizer.mid);
    }

    if (trebleFilterRef.current) {
      trebleFilterRef.current.gain.value = mapBandValue(equalizer.treble);
    }
  }, [equalizer]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (!selectedTrack?.audioUrl) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      setIsPlaying(false);
      setCurrentTime(0);
      setPlaybackDuration(0);
      return;
    }

    let active = true;

    const startPlayback = async () => {
      let nextAudioUrl = selectedTrack.audioUrl;

      if (selectedTrack.sourceType === 'youtube' && selectedTrack.youtubeVideoId) {
        nextAudioUrl = await resolveYouTubeAudioStream(selectedTrack.youtubeVideoId);

        if (!active) {
          return;
        }

        setSelectedTrack((currentTrack) =>
          currentTrack?.id === selectedTrack.id && currentTrack.audioUrl !== nextAudioUrl
            ? { ...currentTrack, audioUrl: nextAudioUrl }
            : currentTrack,
        );
      }

      if (!nextAudioUrl) {
        throw new Error('Missing audio url');
      }

      if (audio.src !== nextAudioUrl) {
        audio.src = nextAudioUrl;
        audio.load();
        setCurrentTime(0);
      }

      if (!isPlaying) {
        audio.pause();
        return;
      }

      void audio.play().catch((error) => {
        console.error('Discora playback start failed', {
          audioUrl: nextAudioUrl,
          error,
          selectedTrack,
        });
        setIsPlaying(false);
      });
    };

    void startPlayback().catch((error) => {
      console.error('Discora playback preparation failed', {
        error,
        selectedTrack,
      });
      setIsPlaying(false);
    });

    return () => {
      active = false;
    };
  }, [isPlaying, selectedTrack]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;

    if (!selectedTrack || !audio) {
      return;
    }

    if (audio.paused) {
      if (audioContextRef.current?.state === 'suspended') {
        void audioContextRef.current.resume();
      }

      void audio.play().catch((error) => {
        console.error('Discora playback resume failed', {
          audioUrl: selectedTrack.audioUrl,
          error,
          selectedTrack,
        });
      });
      return;
    }

    audio.pause();
  }, [selectedTrack]);

  const playTrack = useCallback((song: Song, context: PlaybackContext, queue?: Song[]) => {
    if (audioContextRef.current?.state === 'suspended') {
      void audioContextRef.current.resume();
    }

    setSelectedTrack(song);
    setPlaybackContext(context);
    setPlaybackQueue(queue?.length ? queue : [song]);
    setCurrentTime(0);
    setIsPlaying(true);
    setIsFullPlayerOpen(true);
  }, []);

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const setVolume = useCallback((nextVolume: number) => {
    const normalizedVolume = Math.min(1, Math.max(0, nextVolume));
    setVolumeState(normalizedVolume);
  }, []);

  const setEqualizer = useCallback((nextEqualizer: EqualizerState) => {
    setEqualizerState({
      bass: Math.min(100, Math.max(0, nextEqualizer.bass)),
      mid: Math.min(100, Math.max(0, nextEqualizer.mid)),
      treble: Math.min(100, Math.max(0, nextEqualizer.treble)),
    });
  }, []);

  const previousTrack = useCallback(() => {
    const currentSong = selectedTrackRef.current;
    const queue = playbackQueueRef.current;

    if (!currentSong) {
      return;
    }

    const currentIndex = queue.findIndex((song) => song.id === currentSong.id);

    if (currentIndex <= 0) {
      return;
    }

    setSelectedTrack(queue[currentIndex - 1] ?? null);
    setCurrentTime(0);
    setIsPlaying(true);
  }, []);

  const nextTrack = useCallback(() => {
    const currentSong = selectedTrackRef.current;
    const queue = playbackQueueRef.current;

    if (!currentSong) {
      return;
    }

    const currentIndex = queue.findIndex((song) => song.id === currentSong.id);

    if (currentIndex < 0 || currentIndex >= queue.length - 1) {
      return;
    }

    setSelectedTrack(queue[currentIndex + 1] ?? null);
    setCurrentTime(0);
    setIsPlaying(true);
  }, []);

  const syncLibrarySongs = useCallback((songs: Song[]) => {
    setSelectedTrack((currentTrack) => {
      if (!songs.length) {
        return null;
      }

      if (currentTrack) {
        return songs.find((song) => song.id === currentTrack.id) ?? currentTrack;
      }

      return songs[0];
    });

    setPlaybackQueue((currentQueue) =>
      currentQueue.length && playbackContextRef.current?.type === 'playlist' ? currentQueue : songs,
    );

    setPlaybackContext((currentContext) => currentContext ?? (songs[0] ? { type: 'library' } : null));
  }, []);

  const value = useMemo<PlaybackStore>(
    () => ({
      canGoNext,
      canGoPrevious,
      closeFullPlayer: () => setIsFullPlayerOpen(false),
      currentTime,
      equalizer,
      isFullPlayerOpen,
      isPlaying,
      nextTrack,
      openFullPlayer: () => setIsFullPlayerOpen(true),
      playbackContext,
      playbackDuration,
      playbackQueue,
      playTrack,
      previousTrack,
      setEqualizer,
      setVolume,
      seekTo,
      selectedTrack,
      syncLibrarySongs,
      togglePlayback,
      volume,
    }),
    [
      canGoNext,
      canGoPrevious,
      currentTime,
      equalizer,
      isFullPlayerOpen,
      isPlaying,
      nextTrack,
      playbackContext,
      playbackDuration,
      playbackQueue,
      playTrack,
      previousTrack,
      setEqualizer,
      setVolume,
      seekTo,
      selectedTrack,
      syncLibrarySongs,
      togglePlayback,
      volume,
    ],
  );

  return <PlaybackStoreContext.Provider value={value}>{children}</PlaybackStoreContext.Provider>;
}

export function usePlayback() {
  const context = useContext(PlaybackStoreContext);

  if (!context) {
    throw new Error('usePlayback must be used within PlaybackProvider');
  }

  return context;
}
