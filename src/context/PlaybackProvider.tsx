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
import { DeckState, EqualizerState, MixerState, PlaybackContext, Song } from '../types';

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        configuration: {
          events?: {
            onError?: (event: { data: number }) => void;
            onReady?: () => void;
            onStateChange?: (event: { data: number }) => void;
          };
          height?: string;
          playerVars?: Record<string, number>;
          videoId?: string;
          width?: string;
        },
      ) => YouTubePlayer;
      PlayerState: {
        CUED: number;
        ENDED: number;
        PAUSED: number;
        PLAYING: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YouTubePlayer = {
  cueVideoById: (videoId: string, startSeconds?: number) => void;
  destroy?: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  loadVideoById: (videoId: string, startSeconds?: number) => void;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
  stopVideo: () => void;
};

function getYouTubeVideoId(song: Song | null): string | null {
  if (!song || song.sourceType !== 'youtube') {
    return null;
  }

  if (song.youtubeVideoId?.trim()) {
    return song.youtubeVideoId.trim();
  }

  const rawValue = song.audioUrl?.trim();

  if (!rawValue) {
    return null;
  }

  if (/^[\w-]{6,}$/i.test(rawValue) && !rawValue.includes('/')) {
    return rawValue;
  }

  try {
    const url = new URL(rawValue);
    return url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop() || null;
  } catch {
    return rawValue;
  }
}

type PlaybackStore = {
  canGoNext: boolean;
  canGoPrevious: boolean;
  currentTime: number;
  deckState: DeckState;
  equalizer: EqualizerState;
  isFullPlayerOpen: boolean;
  isPlaying: boolean;
  mixer: MixerState;
  playbackError: string | null;
  playbackContext: PlaybackContext | null;
  playbackDuration: number;
  playbackQueue: Song[];
  selectedTrack: Song | null;
  unavailableSongIds: string[];
  volume: number;
  closeFullPlayer: () => void;
  nextTrack: () => void;
  openFullPlayer: () => void;
  playTrack: (song: Song, context: PlaybackContext, queue?: Song[]) => void;
  previousTrack: () => void;
  setCuePoint: (time?: number) => void;
  setDeckState: (deckState: DeckState) => void;
  setEqualizer: (equalizer: EqualizerState) => void;
  setMixer: (mixer: MixerState) => void;
  setVolume: (volume: number) => void;
  seekTo: (time: number) => void;
  syncLibrarySongs: (songs: Song[]) => void;
  toggleLoop: () => void;
  togglePlayback: () => void;
};

const PlaybackStoreContext = createContext<PlaybackStore | null>(null);

export function PlaybackProvider({ children }: PropsWithChildren) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null);
  const youtubeContainerRef = useRef<HTMLDivElement | null>(null);
  const youtubeApiReadyPromiseRef = useRef<Promise<void> | null>(null);
  const youtubePlayerReadyPromiseRef = useRef<Promise<void> | null>(null);
  const youtubeStatusIntervalRef = useRef<number | null>(null);
  const youtubeAutoplayRetryTimeoutRef = useRef<number | null>(null);
  const activeSourceTypeRef = useRef<Song['sourceType']>('backend');
  const currentYouTubeVideoIdRef = useRef<string | null>(null);
  const currentSourceKeyRef = useRef<string | null>(null);
  const isPlayingRef = useRef(false);
  const pendingYouTubeAutoplayRef = useRef(false);
  const autoplayRequestedRef = useRef(false);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const trebleFilterRef = useRef<BiquadFilterNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const selectedTrackRef = useRef<Song | null>(null);
  const playbackQueueRef = useRef<Song[]>([]);
  const playbackContextRef = useRef<PlaybackContext | null>(null);
  const unavailableSongIdsRef = useRef<string[]>([]);
  const deckStateRef = useRef<DeckState>({
    cuePoint: null,
    loopEnabled: false,
    loopInPoint: null,
    loopOutPoint: null,
    slipMode: false,
    vinylMode: true,
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Song | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [playbackContext, setPlaybackContext] = useState<PlaybackContext | null>(null);
  const [playbackQueue, setPlaybackQueue] = useState<Song[]>([]);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [unavailableSongIds, setUnavailableSongIds] = useState<string[]>([]);
  const [volume, setVolumeState] = useState(0.72);
  const [equalizer, setEqualizerState] = useState<EqualizerState>({
    bass: 62,
    mid: 48,
    treble: 57,
  });
  const [mixer, setMixerState] = useState<MixerState>({
    crossfader: 50,
    filter: 50,
    gain: 50,
  });
  const [deckState, setDeckStateState] = useState<DeckState>(deckStateRef.current);

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
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    playbackQueueRef.current = playbackQueue;
  }, [playbackQueue]);

  useEffect(() => {
    playbackContextRef.current = playbackContext;
  }, [playbackContext]);

  useEffect(() => {
    unavailableSongIdsRef.current = unavailableSongIds;
  }, [unavailableSongIds]);

  useEffect(() => {
    deckStateRef.current = deckState;
  }, [deckState]);

  const markSongUnavailable = useCallback((song: Song, reason: string) => {
    if (song.sourceType !== 'youtube') {
      return;
    }

    const songId = String(song.id);

    console.debug('Discora YouTube song marked unavailable', {
      reason,
      selectedSongId: songId,
      videoId: getYouTubeVideoId(song),
    });

    setUnavailableSongIds((currentIds) => (currentIds.includes(songId) ? currentIds : [...currentIds, songId]));
  }, []);

  const trySkipUnavailableYouTubeSong = useCallback((failedSong: Song, reason: string) => {
    const context = playbackContextRef.current;
    const queue = playbackQueueRef.current;
    const failedSongId = String(failedSong.id);

    if (context?.type !== 'playlist') {
      console.debug('Discora YouTube playback failure without playlist context', {
        reason,
        selectedSongId: failedSongId,
        videoId: getYouTubeVideoId(failedSong),
      });
      return false;
    }

    const currentIndex = queue.findIndex((song) => String(song.id) === failedSongId);

    if (currentIndex < 0) {
      return false;
    }

    const unavailableIds = new Set(unavailableSongIdsRef.current);
    unavailableIds.add(failedSongId);
    const nextPlayableSong = queue.slice(currentIndex + 1).find((song) => !unavailableIds.has(String(song.id)));

    if (!nextPlayableSong) {
      console.debug('Discora YouTube auto-skip found no playable songs', {
        failedSongId,
        reason,
      });
      return false;
    }

    autoplayRequestedRef.current = true;
    console.debug('Discora YouTube auto-skip to next playable song', {
      failedSongId,
      nextSongId: nextPlayableSong.id,
      reason,
    });
    setSelectedTrack(nextPlayableSong);
    setCurrentTime(0);
    setIsPlaying(true);
    return true;
  }, []);

  const handleYouTubePlaybackFailure = useCallback((song: Song | null, reason: string, uiMessage: string) => {
    if (!song) {
      setPlaybackError(uiMessage);
      setIsPlaying(false);
      return;
    }

    console.debug('Discora YouTube playback failure handled', {
      reason,
      selectedSongId: song.id,
      videoId: getYouTubeVideoId(song),
    });
    markSongUnavailable(song, reason);

    if (!trySkipUnavailableYouTubeSong(song, reason)) {
      setPlaybackError(uiMessage);
      setIsPlaying(false);
    }
  }, [markSongUnavailable, trySkipUnavailableYouTubeSong]);

  const clearYouTubeStatusInterval = useCallback(() => {
    if (youtubeStatusIntervalRef.current !== null) {
      window.clearInterval(youtubeStatusIntervalRef.current);
      youtubeStatusIntervalRef.current = null;
    }
  }, []);

  const clearYouTubeAutoplayRetry = useCallback(() => {
    if (youtubeAutoplayRetryTimeoutRef.current !== null) {
      window.clearTimeout(youtubeAutoplayRetryTimeoutRef.current);
      youtubeAutoplayRetryTimeoutRef.current = null;
    }
  }, []);

  const syncYouTubePlaybackStatus = useCallback(() => {
    const youtubePlayer = youtubePlayerRef.current;

    if (!youtubePlayer || activeSourceTypeRef.current !== 'youtube') {
      return;
    }

    const nextCurrentTime = youtubePlayer.getCurrentTime();
    const nextDuration = youtubePlayer.getDuration();

    if (Number.isFinite(nextCurrentTime)) {
      const loopOutPoint = deckStateRef.current.loopEnabled ? deckStateRef.current.loopOutPoint : null;
      const loopInPoint = deckStateRef.current.loopInPoint;

      if (
        loopOutPoint !== null &&
        loopInPoint !== null &&
        nextCurrentTime >= loopOutPoint &&
        loopOutPoint > loopInPoint
      ) {
        youtubePlayer.seekTo(loopInPoint, true);
        setCurrentTime(loopInPoint);
        return;
      }

      setCurrentTime(nextCurrentTime);
    }

    if (Number.isFinite(nextDuration) && nextDuration > 0) {
      setPlaybackDuration(nextDuration);
    }
  }, []);

  const startYouTubeStatusInterval = useCallback(() => {
    clearYouTubeStatusInterval();
    youtubeStatusIntervalRef.current = window.setInterval(syncYouTubePlaybackStatus, 500);
  }, [clearYouTubeStatusInterval, syncYouTubePlaybackStatus]);

  const loadYouTubeApi = useCallback(() => {
    if (window.YT?.Player) {
      console.debug('Discora YouTube iframe API already available');
      return Promise.resolve();
    }

    if (youtubeApiReadyPromiseRef.current) {
      return youtubeApiReadyPromiseRef.current;
    }

    youtubeApiReadyPromiseRef.current = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>('script[data-discora-youtube-api="true"]');

      const handleReady = () => resolve();

      window.onYouTubeIframeAPIReady = () => {
        console.debug('Discora YouTube iframe API ready');
        handleReady();
      };

      if (!existingScript) {
        console.debug('Discora YouTube iframe API loading');
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        script.dataset.discoraYoutubeApi = 'true';
        script.onerror = () => {
          console.error('Discora YouTube iframe API failed to load');
          reject(new Error('Unable to load YouTube iframe API'));
        };
        document.body.appendChild(script);
      }
    });

    return youtubeApiReadyPromiseRef.current;
  }, []);

  const ensureYouTubePlayer = useCallback(async () => {
    if (youtubePlayerRef.current) {
      console.debug('Discora YouTube player already initialized');
      return youtubePlayerRef.current;
    }

    await loadYouTubeApi();

    if (youtubePlayerRef.current) {
      return youtubePlayerRef.current;
    }

    if (!youtubeContainerRef.current || !window.YT?.Player) {
      console.error('Discora YouTube player initialization failed', {
        hasContainer: Boolean(youtubeContainerRef.current),
        hasYT: Boolean(window.YT?.Player),
      });
      throw new Error('YouTube player container unavailable');
    }

    youtubePlayerReadyPromiseRef.current = new Promise<void>((resolve) => {
      console.debug('Discora YouTube player initializing');
      youtubePlayerRef.current = new window.YT!.Player(youtubeContainerRef.current!, {
        height: '1',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
        width: '1',
        events: {
          onReady: () => {
            console.debug('Discora YouTube player ready', {
              selectedSongId: selectedTrackRef.current?.id ?? null,
              videoId: currentYouTubeVideoIdRef.current,
            });
            youtubePlayerRef.current?.setVolume(Math.round(volume * 100));
            resolve();
          },
          onStateChange: (event) => {
            if (!window.YT || activeSourceTypeRef.current !== 'youtube') {
              return;
            }

            console.debug('Discora YouTube player state changed', {
              selectedSongId: selectedTrackRef.current?.id ?? null,
              videoId: currentYouTubeVideoIdRef.current,
              youtubeState: event.data,
            });

            if (event.data === window.YT.PlayerState.PLAYING) {
              clearYouTubeAutoplayRetry();
              pendingYouTubeAutoplayRef.current = false;
              autoplayRequestedRef.current = false;
              console.debug('Discora YouTube playback started', {
                selectedSongId: selectedTrackRef.current?.id ?? null,
                videoId: currentYouTubeVideoIdRef.current,
              });
              setPlaybackError(null);
              setIsPlaying(true);
              startYouTubeStatusInterval();
              syncYouTubePlaybackStatus();
              return;
            }

            if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.CUED) {
              if (event.data === window.YT.PlayerState.CUED && pendingYouTubeAutoplayRef.current) {
                console.debug('Discora YouTube cue acknowledged while autoplay is pending', {
                  selectedSongId: selectedTrackRef.current?.id ?? null,
                  videoId: currentYouTubeVideoIdRef.current,
                });
                return;
              }

              clearYouTubeAutoplayRetry();
              clearYouTubeStatusInterval();
              setIsPlaying(false);
              syncYouTubePlaybackStatus();
              return;
            }

            if (event.data === window.YT.PlayerState.ENDED) {
              clearYouTubeAutoplayRetry();
              clearYouTubeStatusInterval();
              const currentSong = selectedTrackRef.current;
              const queue = playbackQueueRef.current;

              console.debug('Discora YouTube playback ended', {
                selectedSongId: currentSong?.id ?? null,
                videoId: currentYouTubeVideoIdRef.current,
                queueLength: queue.length,
              });

              if (!currentSong) {
                setIsPlaying(false);
                setCurrentTime(0);
                return;
              }

              const currentIndex = queue.findIndex((song) => song.id === currentSong.id);

              if (currentIndex >= 0 && currentIndex < queue.length - 1) {
                autoplayRequestedRef.current = true;
                console.debug('Discora YouTube next-track autoplay trigger', {
                  currentSongId: currentSong.id,
                  nextSongId: queue[currentIndex + 1]?.id ?? null,
                });
                setSelectedTrack(queue[currentIndex + 1]);
                setCurrentTime(0);
                setIsPlaying(true);
                return;
              }

              if (deckStateRef.current.loopEnabled) {
                const restartTime = deckStateRef.current.loopInPoint ?? 0;
                youtubePlayerRef.current?.seekTo(restartTime, true);
                youtubePlayerRef.current?.playVideo();
                setCurrentTime(restartTime);
                setIsPlaying(true);
                return;
              }

              setIsPlaying(false);
              setCurrentTime(0);
            }
          },
          onError: (event) => {
            console.error('Discora YouTube playback error', {
              selectedSongId: selectedTrackRef.current?.id ?? null,
              videoId: currentYouTubeVideoIdRef.current,
              youtubeErrorCode: event.data,
            });
            clearYouTubeAutoplayRetry();
            clearYouTubeStatusInterval();
            handleYouTubePlaybackFailure(
              selectedTrackRef.current,
              `youtube-error-${event.data}`,
              'No fue posible reproducir esta cancion de YouTube.',
            );
          },
        },
      });
    });

    await youtubePlayerReadyPromiseRef.current;
    return youtubePlayerRef.current!;
  }, [clearYouTubeAutoplayRetry, clearYouTubeStatusInterval, handleYouTubePlaybackFailure, loadYouTubeApi, startYouTubeStatusInterval, syncYouTubePlaybackStatus, volume]);

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
        const filterNode = audioContext.createBiquadFilter();
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
        trebleFilter.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(audioContext.destination);

        audioContextRef.current = audioContext;
        mediaSourceRef.current = mediaSource;
        gainNodeRef.current = gainNode;
        bassFilterRef.current = bassFilter;
        midFilterRef.current = midFilter;
        trebleFilterRef.current = trebleFilter;
        filterNodeRef.current = filterNode;
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

      if (deckStateRef.current.loopEnabled) {
        const restartTime = deckStateRef.current.loopInPoint ?? 0;
        audio.currentTime = restartTime;
        setCurrentTime(restartTime);
        setIsPlaying(true);
        void audio.play();
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
      setPlaybackError('No fue posible reproducir esta cancion.');
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setPlaybackError(null);
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleTimeUpdate = () => {
      const nextTime = audio.currentTime;
      const { loopEnabled, loopInPoint, loopOutPoint } = deckStateRef.current;

      if (loopEnabled && loopInPoint !== null && loopOutPoint !== null && loopOutPoint > loopInPoint && nextTime >= loopOutPoint) {
        audio.currentTime = loopInPoint;
        setCurrentTime(loopInPoint);
        return;
      }

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
      clearYouTubeAutoplayRetry();
      clearYouTubeStatusInterval();
      youtubePlayerRef.current?.stopVideo();
      pendingYouTubeAutoplayRef.current = false;
      autoplayRequestedRef.current = false;
      youtubePlayerRef.current?.destroy?.();
      gainNodeRef.current?.disconnect();
      trebleFilterRef.current?.disconnect();
      filterNodeRef.current?.disconnect();
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
  }, [clearYouTubeAutoplayRetry, clearYouTubeStatusInterval]);

  useEffect(() => {
    const audio = audioRef.current;
    const youtubePlayer = youtubePlayerRef.current;
    const crossfadeFactor = mixer.crossfader <= 50 ? 1 : 1 - (mixer.crossfader - 50) / 50;
    const gainFactor = 0.7 + (mixer.gain / 100) * 0.6;
    const effectiveVolume = Math.min(1, Math.max(0, volume * crossfadeFactor * gainFactor));

    if (!audio) {
      return;
    }

    if (selectedTrackRef.current?.sourceType === 'youtube' && youtubePlayer) {
      youtubePlayer.setVolume(Math.round(effectiveVolume * 100));
      return;
    }

    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = effectiveVolume;
      return;
    }

    audio.volume = effectiveVolume;
  }, [mixer.crossfader, mixer.gain, volume]);

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
    if (!filterNodeRef.current) {
      return;
    }

    const filterValue = mixer.filter;

    if (filterValue === 50) {
      filterNodeRef.current.type = 'allpass';
      filterNodeRef.current.frequency.value = 1200;
      return;
    }

    if (filterValue < 50) {
      filterNodeRef.current.type = 'lowpass';
      filterNodeRef.current.frequency.value = 800 + (filterValue / 50) * 19200;
      return;
    }

    filterNodeRef.current.type = 'highpass';
    filterNodeRef.current.frequency.value = 40 + ((filterValue - 50) / 50) * 4000;
  }, [mixer.filter]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (!selectedTrack) {
      audio.pause();
      clearYouTubeAutoplayRetry();
      clearYouTubeStatusInterval();
      youtubePlayerRef.current?.stopVideo();
      pendingYouTubeAutoplayRef.current = false;
      autoplayRequestedRef.current = false;
      audio.removeAttribute('src');
      audio.load();
      setPlaybackError(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setPlaybackDuration(0);
      return;
    }

    let active = true;

    const preparePlaybackSource = async () => {
      const youtubeVideoId = getYouTubeVideoId(selectedTrack);

      if (selectedTrack.sourceType === 'youtube' && youtubeVideoId) {
        if (unavailableSongIdsRef.current.includes(String(selectedTrack.id))) {
          console.debug('Discora YouTube playback blocked for unavailable song', {
            selectedSongId: selectedTrack.id,
            videoId: youtubeVideoId,
          });
          handleYouTubePlaybackFailure(
            selectedTrack,
            'unavailable-in-session',
            'Esta cancion de YouTube no esta disponible en esta sesion.',
          );
          return;
        }

        console.debug('Discora YouTube song selected', {
          selectedSongId: selectedTrack.id,
          videoId: youtubeVideoId,
          sourceAudioUrl: selectedTrack.audioUrl,
        });
        setPlaybackError(null);

        activeSourceTypeRef.current = 'youtube';
        currentSourceKeyRef.current = `youtube:${youtubeVideoId}`;
        audio.pause();
        const youtubePlayer = await ensureYouTubePlayer();

        if (!active) {
          return;
        }

        currentYouTubeVideoIdRef.current = youtubeVideoId;
        setPlaybackDuration(0);
        setCurrentTime(0);
        const shouldAutoplay = autoplayRequestedRef.current || isPlayingRef.current;
        pendingYouTubeAutoplayRef.current = shouldAutoplay;
        console.debug('Discora YouTube playback source resolved', {
          playbackSource: 'youtube-iframe',
          requestedAutoplay: autoplayRequestedRef.current,
          shouldAutoplay,
          videoId: youtubeVideoId,
        });

        if (shouldAutoplay) {
          console.debug('Discora YouTube autoplay trigger moment', {
            selectedSongId: selectedTrack.id,
            videoId: youtubeVideoId,
          });
          youtubePlayer.loadVideoById(youtubeVideoId, 0);
          clearYouTubeAutoplayRetry();
          youtubeAutoplayRetryTimeoutRef.current = window.setTimeout(() => {
            if (
              pendingYouTubeAutoplayRef.current &&
              currentYouTubeVideoIdRef.current === youtubeVideoId &&
              selectedTrackRef.current?.id === selectedTrack.id
            ) {
              console.debug('Discora YouTube autoplay retry trigger', {
                selectedSongId: selectedTrack.id,
                videoId: youtubeVideoId,
              });
              youtubePlayer.playVideo();
            }
          }, 350);
        } else {
          youtubePlayer.cueVideoById(youtubeVideoId, 0);
        }

        return;
      }

      if (selectedTrack.sourceType === 'youtube' && !youtubeVideoId) {
        console.error('Discora YouTube playback preparation failed', {
          selectedSongId: selectedTrack.id,
          videoId: youtubeVideoId,
          reason: 'missing-youtube-video-id',
          selectedTrack,
        });
        handleYouTubePlaybackFailure(
          selectedTrack,
          'missing-youtube-video-id',
          'Esta cancion de YouTube no tiene un video valido para reproducir.',
        );
        return;
      }

      activeSourceTypeRef.current = 'backend';
      clearYouTubeStatusInterval();
      youtubePlayerRef.current?.pauseVideo();
      currentYouTubeVideoIdRef.current = null;
      clearYouTubeAutoplayRetry();
      pendingYouTubeAutoplayRef.current = false;
      autoplayRequestedRef.current = false;
      currentSourceKeyRef.current = `audio:${selectedTrack.audioUrl}`;

      if (!selectedTrack.audioUrl) {
        throw new Error('Missing audio url');
      }

      console.debug('Discora local song selected', {
        selectedTrack,
        playbackSource: selectedTrack.audioUrl,
      });
      setPlaybackError(null);

      if (audio.src !== selectedTrack.audioUrl) {
        audio.src = selectedTrack.audioUrl;
        audio.load();
        setCurrentTime(0);
      }
    };

    const nextSourceKey =
      selectedTrack.sourceType === 'youtube'
        ? `youtube:${getYouTubeVideoId(selectedTrack) ?? 'missing'}`
        : `audio:${selectedTrack.audioUrl}`;

    if (currentSourceKeyRef.current === nextSourceKey) {
      return () => {
        active = false;
      };
    }

    void preparePlaybackSource().catch((error) => {
      console.error('Discora playback preparation failed', {
        error,
        selectedTrack,
      });
      setPlaybackError('No fue posible preparar esta reproduccion.');
      setIsPlaying(false);
    });

    return () => {
      active = false;
    };
  }, [clearYouTubeAutoplayRetry, clearYouTubeStatusInterval, ensureYouTubePlayer, handleYouTubePlaybackFailure, selectedTrack]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!selectedTrack) {
      return;
    }

    if (selectedTrack.sourceType === 'youtube') {
      const youtubePlayer = youtubePlayerRef.current;
      const youtubeVideoId = getYouTubeVideoId(selectedTrack);

      if (!youtubePlayer || !youtubeVideoId) {
        console.error('Discora YouTube playback toggle failed', {
          selectedSongId: selectedTrack.id,
          videoId: youtubeVideoId,
          hasPlayer: Boolean(youtubePlayer),
          isPlaying,
        });
        handleYouTubePlaybackFailure(
          selectedTrack,
          youtubePlayer ? 'missing-video-id' : 'youtube-player-unavailable',
          'La reproduccion de YouTube no esta disponible para esta cancion.',
        );
        return;
      }

      console.debug('Discora YouTube playback command', {
        selectedSongId: selectedTrack.id,
        videoId: youtubeVideoId,
        isPlaying,
      });

      if (isPlaying) {
        autoplayRequestedRef.current = false;
        youtubePlayer.playVideo();
      } else {
        clearYouTubeAutoplayRetry();
        autoplayRequestedRef.current = false;
        youtubePlayer.pauseVideo();
      }

      return;
    }

    if (!audio) {
      return;
    }

    if (isPlaying) {
      if (audioContextRef.current?.state === 'suspended') {
        void audioContextRef.current.resume();
      }

      void audio.play().catch((error) => {
        console.error('Discora playback start failed', {
          audioUrl: selectedTrack.audioUrl,
          error,
          selectedTrack,
        });
        setPlaybackError('No fue posible iniciar la reproduccion.');
        setIsPlaying(false);
      });
      return;
    }

    audio.pause();
  }, [handleYouTubePlaybackFailure, isPlaying, selectedTrack]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;

    if (!selectedTrack) {
      return;
    }

    if (selectedTrack.sourceType === 'youtube') {
      const youtubeVideoId = getYouTubeVideoId(selectedTrack);
      const youtubePlayer = youtubePlayerRef.current;

      if (!youtubePlayer || !youtubeVideoId) {
        console.error('Discora YouTube playback resume failed', {
          selectedSongId: selectedTrack.id,
          videoId: youtubeVideoId,
          reason: youtubePlayer ? 'missing-video-id' : 'youtube-player-unavailable',
        });
        handleYouTubePlaybackFailure(
          selectedTrack,
          youtubePlayer ? 'missing-video-id' : 'youtube-player-unavailable',
          'Esta cancion de YouTube no se puede reproducir ahora.',
        );
        return;
      }

      if (isPlaying) {
        youtubePlayer.pauseVideo();
        return;
      }

      if (audioContextRef.current?.state === 'suspended') {
        void audioContextRef.current.resume();
      }

      youtubePlayer.playVideo();
      return;
    }

    if (!audio) {
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
        setPlaybackError('No fue posible reanudar la reproduccion.');
      });
      return;
    }

    audio.pause();
  }, [handleYouTubePlaybackFailure, isPlaying, selectedTrack]);

  const playTrack = useCallback((song: Song, context: PlaybackContext, queue?: Song[]) => {
    console.debug('Discora playTrack request', {
      selectedSongId: song.id,
      sourceType: song.sourceType,
      videoId: getYouTubeVideoId(song),
      queueLength: queue?.length ?? 1,
    });
    setPlaybackError(null);
    autoplayRequestedRef.current = true;

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

    if (!selectedTrack) {
      return;
    }

    if (selectedTrack.sourceType === 'youtube') {
      const youtubePlayer = youtubePlayerRef.current;

      if (!youtubePlayer) {
        return;
      }

      youtubePlayer.seekTo(time, true);
      setCurrentTime(time);
      return;
    }

    if (!audio) {
      return;
    }

    audio.currentTime = time;
    setCurrentTime(time);
  }, [selectedTrack]);

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

  const setMixer = useCallback((nextMixer: MixerState) => {
    setMixerState({
      crossfader: Math.min(100, Math.max(0, nextMixer.crossfader)),
      filter: Math.min(100, Math.max(0, nextMixer.filter)),
      gain: Math.min(100, Math.max(0, nextMixer.gain)),
    });
  }, []);

  const setDeckState = useCallback((nextDeckState: DeckState) => {
    setDeckStateState({
      cuePoint: nextDeckState.cuePoint,
      loopEnabled: nextDeckState.loopEnabled,
      loopInPoint: nextDeckState.loopInPoint,
      loopOutPoint: nextDeckState.loopOutPoint,
      slipMode: nextDeckState.slipMode,
      vinylMode: nextDeckState.vinylMode,
    });
  }, []);

  const setCuePoint = useCallback((time?: number) => {
    setDeckStateState((currentDeckState) => ({
      ...currentDeckState,
      cuePoint: typeof time === 'number' ? time : currentTime,
    }));
  }, [currentTime]);

  const toggleLoop = useCallback(() => {
    setDeckStateState((currentDeckState) => ({
      ...currentDeckState,
      loopEnabled: !currentDeckState.loopEnabled,
      loopInPoint: currentDeckState.loopInPoint ?? 0,
      loopOutPoint:
        currentDeckState.loopOutPoint ??
        (playbackDuration > 0 ? playbackDuration : null),
    }));
  }, [playbackDuration]);

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

    autoplayRequestedRef.current = true;
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

    autoplayRequestedRef.current = true;
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
      deckState,
      equalizer,
      isFullPlayerOpen,
      isPlaying,
      mixer,
      nextTrack,
      openFullPlayer: () => setIsFullPlayerOpen(true),
      playbackError,
      playbackContext,
      playbackDuration,
      playbackQueue,
      playTrack,
      previousTrack,
      setCuePoint,
      setDeckState,
      setEqualizer,
      setMixer,
      setVolume,
      seekTo,
      selectedTrack,
      syncLibrarySongs,
      toggleLoop,
      togglePlayback,
      unavailableSongIds,
      volume,
    }),
    [
      canGoNext,
      canGoPrevious,
      currentTime,
      deckState,
      equalizer,
      isFullPlayerOpen,
      isPlaying,
      mixer,
      nextTrack,
      playbackError,
      playbackContext,
      playbackDuration,
      playbackQueue,
      playTrack,
      previousTrack,
      setCuePoint,
      setDeckState,
      setEqualizer,
      setMixer,
      setVolume,
      seekTo,
      selectedTrack,
      syncLibrarySongs,
      toggleLoop,
      togglePlayback,
      unavailableSongIds,
      volume,
    ],
  );

  return (
    <PlaybackStoreContext.Provider value={value}>
      {children}
      <div
        ref={youtubeContainerRef}
        aria-hidden="true"
        style={{
          height: 1,
          left: -9999,
          opacity: 0,
          pointerEvents: 'none',
          position: 'fixed',
          top: 0,
          width: 1,
        }}
      />
    </PlaybackStoreContext.Provider>
  );
}

export function usePlayback() {
  const context = useContext(PlaybackStoreContext);

  if (!context) {
    throw new Error('usePlayback must be used within PlaybackProvider');
  }

  return context;
}
