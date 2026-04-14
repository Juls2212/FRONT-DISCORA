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
import { PlaybackContext, Song } from '../types';

type PlaybackStore = {
  canGoNext: boolean;
  canGoPrevious: boolean;
  currentTime: number;
  isFullPlayerOpen: boolean;
  isPlaying: boolean;
  playbackContext: PlaybackContext | null;
  playbackDuration: number;
  playbackQueue: Song[];
  selectedTrack: Song | null;
  closeFullPlayer: () => void;
  nextTrack: () => void;
  openFullPlayer: () => void;
  playTrack: (song: Song, context: PlaybackContext, queue?: Song[]) => void;
  previousTrack: () => void;
  seekTo: (time: number) => void;
  syncLibrarySongs: (songs: Song[]) => void;
  togglePlayback: () => void;
};

const PlaybackStoreContext = createContext<PlaybackStore | null>(null);

export function PlaybackProvider({ children }: PropsWithChildren) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

    if (!selectedTrack?.audioUrl) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      setIsPlaying(false);
      setCurrentTime(0);
      setPlaybackDuration(0);
      return;
    }

    if (audio.src !== selectedTrack.audioUrl) {
      audio.src = selectedTrack.audioUrl;
      audio.load();
      setCurrentTime(0);
    }

    if (!isPlaying) {
      audio.pause();
      return;
    }

    void audio.play().catch((error) => {
      console.error('Discora playback start failed', {
        audioUrl: selectedTrack.audioUrl,
        error,
        selectedTrack,
      });
      setIsPlaying(false);
    });
  }, [isPlaying, selectedTrack]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;

    if (!selectedTrack || !audio) {
      return;
    }

    if (audio.paused) {
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
      isFullPlayerOpen,
      isPlaying,
      nextTrack,
      openFullPlayer: () => setIsFullPlayerOpen(true),
      playbackContext,
      playbackDuration,
      playbackQueue,
      playTrack,
      previousTrack,
      seekTo,
      selectedTrack,
      syncLibrarySongs,
      togglePlayback,
    }),
    [
      canGoNext,
      canGoPrevious,
      currentTime,
      isFullPlayerOpen,
      isPlaying,
      nextTrack,
      playbackContext,
      playbackDuration,
      playbackQueue,
      playTrack,
      previousTrack,
      seekTo,
      selectedTrack,
      syncLibrarySongs,
      togglePlayback,
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
