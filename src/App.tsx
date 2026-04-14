import { useEffect, useMemo, useRef, useState } from 'react';
import { FullPlayer } from './components/FullPlayer';
import { LibraryView } from './components/LibraryView';
import { MainContent } from './components/MainContent';
import { MiniPlayer } from './components/MiniPlayer';
import { PlaylistsView } from './components/PlaylistsView';
import { Sidebar } from './components/Sidebar';
import { getPlaylists, getSongs } from './services/discoraApi';
import { PlaybackContext, Playlist, Song, SongPresentationState } from './types';
import { decorateSong, decorateSongs, getSongIdKey } from './utils/songPresentation';
import { needsDurationResolution, resolveSongDuration } from './utils/audio';

type Theme = 'dark' | 'light';
type ViewName = 'home' | 'library' | 'playlists';

const THEME_STORAGE_KEY = 'discora-theme';
const FAVORITES_STORAGE_KEY = 'discora-favorite-song-ids';
const MANUAL_COVERS_STORAGE_KEY = 'discora-manual-cover-by-song-id';
const EMBEDDED_COVERS_STORAGE_KEY = 'discora-embedded-cover-by-song-id';

function readStorageRecord(storageKey: string): Record<string, string> {
  try {
    const value = window.localStorage.getItem(storageKey);
    return value ? (JSON.parse(value) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function readStorageArray(storageKey: string): string[] {
  try {
    const value = window.localStorage.getItem(storageKey);
    return value ? (JSON.parse(value) as string[]) : [];
  } catch {
    return [];
  }
}

function App() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [songsLoading, setSongsLoading] = useState(true);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);
  const [songsError, setSongsError] = useState<string | null>(null);
  const [playlistsError, setPlaylistsError] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Song | null>(null);
  const [activeView, setActiveView] = useState<ViewName>('home');
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackContext, setPlaybackContext] = useState<PlaybackContext | null>(null);
  const [playbackQueue, setPlaybackQueue] = useState<Song[]>([]);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [favoriteSongIds, setFavoriteSongIds] = useState<string[]>(() => readStorageArray(FAVORITES_STORAGE_KEY));
  const [manualCoverBySongId, setManualCoverBySongId] = useState<Record<string, string>>(
    () => readStorageRecord(MANUAL_COVERS_STORAGE_KEY),
  );
  const [embeddedCoverBySongId, setEmbeddedCoverBySongId] = useState<Record<string, string>>(
    () => readStorageRecord(EMBEDDED_COVERS_STORAGE_KEY),
  );

  const presentationState = useMemo<SongPresentationState>(
    () => ({
      embeddedCoverBySongId,
      favoriteSongIds,
      manualCoverBySongId,
    }),
    [embeddedCoverBySongId, favoriteSongIds, manualCoverBySongId],
  );

  const displayedSongs = useMemo(() => decorateSongs(songs, presentationState), [songs, presentationState]);
  const displayedSelectedTrack = useMemo(
    () => (selectedTrack ? decorateSong(selectedTrack, presentationState) : null),
    [presentationState, selectedTrack],
  );

  const currentTrackIndex = useMemo(() => {
    if (!selectedTrack) {
      return -1;
    }

    return playbackQueue.findIndex((song) => song.id === selectedTrack.id);
  }, [playbackQueue, selectedTrack]);

  const canGoPrevious = currentTrackIndex > 0;
  const canGoNext = currentTrackIndex >= 0 && currentTrackIndex < playbackQueue.length - 1;

  useEffect(() => {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteSongIds));
  }, [favoriteSongIds]);

  useEffect(() => {
    window.localStorage.setItem(MANUAL_COVERS_STORAGE_KEY, JSON.stringify(manualCoverBySongId));
  }, [manualCoverBySongId]);

  useEffect(() => {
    window.localStorage.setItem(EMBEDDED_COVERS_STORAGE_KEY, JSON.stringify(embeddedCoverBySongId));
  }, [embeddedCoverBySongId]);

  const loadSongs = async () => {
    setSongsLoading(true);
    setSongsError(null);

    try {
      const nextSongs = await getSongs();
      setSongs(nextSongs);
      setSelectedTrack((currentTrack) => currentTrack ?? nextSongs[0] ?? null);
      setPlaybackContext((currentContext) => currentContext ?? (nextSongs[0] ? { type: 'library' } : null));
      setPlaybackQueue((currentQueue) => (currentQueue.length ? currentQueue : nextSongs));
    } catch {
      setSongsError('No se pudieron cargar las canciones.');
    } finally {
      setSongsLoading(false);
    }
  };

  const loadPlaylists = async () => {
    setPlaylistsLoading(true);
    setPlaylistsError(null);

    try {
      const nextPlaylists = await getPlaylists();
      setPlaylists(nextPlaylists);
    } catch {
      setPlaylistsError('No se pudieron cargar las playlists.');
    } finally {
      setPlaylistsLoading(false);
    }
  };

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (storedTheme === 'dark' || storedTheme === 'light') {
      setTheme(storedTheme);
      return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleEnded = () => {
      if (currentTrackIndex >= 0 && currentTrackIndex < playbackQueue.length - 1) {
        setSelectedTrack(playbackQueue[currentTrackIndex + 1]);
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
        selectedTrack,
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
  }, [currentTrackIndex, playbackQueue, selectedTrack]);

  useEffect(() => {
    void loadSongs();
    void loadPlaylists();
  }, []);

  useEffect(() => {
    const songsToResolve = songs.filter((song) => song.audioUrl && needsDurationResolution(song));

    if (!songsToResolve.length) {
      return;
    }

    let active = true;

    void Promise.allSettled(
      songsToResolve.map(async (song) => ({
        duration: await resolveSongDuration(song),
        id: song.id,
      })),
    ).then((results) => {
      if (!active) {
        return;
      }

      const resolvedDurations = new Map(
        results
          .filter(
            (result): result is PromiseFulfilledResult<{ duration: string; id: Song['id'] }> =>
              result.status === 'fulfilled',
          )
          .map((result) => [result.value.id, result.value.duration]),
      );

      if (!resolvedDurations.size) {
        return;
      }

      setSongs((currentSongs) =>
        currentSongs.map((song) =>
          resolvedDurations.has(song.id)
            ? { ...song, duration: resolvedDurations.get(song.id) ?? song.duration }
            : song,
        ),
      );

      setPlaybackQueue((currentQueue) =>
        currentQueue.map((song) =>
          resolvedDurations.has(song.id)
            ? { ...song, duration: resolvedDurations.get(song.id) ?? song.duration }
            : song,
        ),
      );

      setSelectedTrack((currentTrack) =>
        currentTrack && resolvedDurations.has(currentTrack.id)
          ? { ...currentTrack, duration: resolvedDurations.get(currentTrack.id) ?? currentTrack.duration }
          : currentTrack,
      );
    });

    return () => {
      active = false;
    };
  }, [songs]);

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

  const handleTogglePlayback = () => {
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
  };

  const handleToggleTheme = () => {
    setTheme((previousTheme) => (previousTheme === 'dark' ? 'light' : 'dark'));
  };

  const handleSongsReload = (nextSongs: Song[]) => {
    setSongs(nextSongs);
    setSelectedTrack((currentTrack) => {
      if (!nextSongs.length) {
        return null;
      }

      if (currentTrack) {
        return nextSongs.find((song) => song.id === currentTrack.id) ?? nextSongs[0];
      }

      return nextSongs[0];
    });

    setPlaybackQueue((currentQueue) =>
      currentQueue.length && playbackContext?.type === 'playlist' ? currentQueue : nextSongs,
    );
  };

  const handlePlayTrack = (song: Song, context: PlaybackContext, queue?: Song[]) => {
    setSelectedTrack(song);
    setPlaybackContext(context);
    setPlaybackQueue(queue?.length ? queue : [song]);
    setCurrentTime(0);
    setIsPlaying(true);
    setIsFullPlayerOpen(true);
  };

  const handleSeek = (nextTime: number) => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handlePreviousTrack = () => {
    if (!canGoPrevious) {
      return;
    }

    setSelectedTrack(playbackQueue[currentTrackIndex - 1] ?? null);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const handleNextTrack = () => {
    if (!canGoNext) {
      return;
    }

    setSelectedTrack(playbackQueue[currentTrackIndex + 1] ?? null);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const handleToggleFavorite = (songId: Song['id']) => {
    const songKey = getSongIdKey(songId);

    setFavoriteSongIds((currentFavorites) =>
      currentFavorites.includes(songKey)
        ? currentFavorites.filter((favoriteId) => favoriteId !== songKey)
        : [...currentFavorites, songKey],
    );
  };

  const handleAssignManualCover = (songId: Song['id'], coverDataUrl: string) => {
    const songKey = getSongIdKey(songId);
    setManualCoverBySongId((currentCovers) => ({
      ...currentCovers,
      [songKey]: coverDataUrl,
    }));
  };

  const handleAssignEmbeddedCover = (songId: Song['id'], coverDataUrl: string) => {
    const songKey = getSongIdKey(songId);

    setEmbeddedCoverBySongId((currentCovers) => {
      if (currentCovers[songKey]) {
        return currentCovers;
      }

      return {
        ...currentCovers,
        [songKey]: coverDataUrl,
      };
    });
  };

  return (
    <div className="app-shell">
      <div className="app-layout">
        <Sidebar
          activeView={activeView}
          playlists={playlists}
          playlistsError={playlistsError}
          playlistsLoading={playlistsLoading}
          theme={theme}
          onSelectView={setActiveView}
          onToggleTheme={handleToggleTheme}
        />
        <div className="content-shell">
          {activeView === 'library' ? (
            <LibraryView
              embeddedCoverBySongId={embeddedCoverBySongId}
              favoriteSongIds={favoriteSongIds}
              manualCoverBySongId={manualCoverBySongId}
              onAssignEmbeddedCover={handleAssignEmbeddedCover}
              onAssignManualCover={handleAssignManualCover}
              onPlayTrack={handlePlayTrack}
              onSongsReload={handleSongsReload}
              onToggleFavorite={handleToggleFavorite}
            />
          ) : activeView === 'playlists' ? (
            <PlaylistsView
              embeddedCoverBySongId={embeddedCoverBySongId}
              favoriteSongIds={favoriteSongIds}
              manualCoverBySongId={manualCoverBySongId}
              playlists={playlists}
              playlistsError={playlistsError}
              playlistsLoading={playlistsLoading}
              songs={displayedSongs}
              onPlayTrack={handlePlayTrack}
              onRefreshPlaylists={loadPlaylists}
              onToggleFavorite={handleToggleFavorite}
            />
          ) : (
            <MainContent
              onPlayTrack={handlePlayTrack}
              playlists={playlists}
              playlistsError={playlistsError}
              playlistsLoading={playlistsLoading}
              songs={displayedSongs}
              songsError={songsError}
              songsLoading={songsLoading}
            />
          )}
        </div>
      </div>
      <MiniPlayer
        canGoNext={canGoNext}
        canGoPrevious={canGoPrevious}
        currentTime={currentTime}
        isPlaying={isPlaying}
        onNext={handleNextTrack}
        onOpenFullPlayer={() => setIsFullPlayerOpen(true)}
        onPrevious={handlePreviousTrack}
        onSeek={handleSeek}
        onTogglePlayback={handleTogglePlayback}
        playbackContext={playbackContext}
        playbackDuration={playbackDuration}
        selectedTrack={displayedSelectedTrack}
      />
      <FullPlayer
        canGoNext={canGoNext}
        canGoPrevious={canGoPrevious}
        currentTime={currentTime}
        isOpen={isFullPlayerOpen}
        isPlaying={isPlaying}
        onClose={() => setIsFullPlayerOpen(false)}
        onNext={handleNextTrack}
        onPrevious={handlePreviousTrack}
        onSeek={handleSeek}
        onToggleFavorite={() => {
          if (displayedSelectedTrack) {
            handleToggleFavorite(displayedSelectedTrack.id);
          }
        }}
        onTogglePlayback={handleTogglePlayback}
        playbackContext={playbackContext}
        playbackDuration={playbackDuration}
        selectedTrack={displayedSelectedTrack}
      />
    </div>
  );
}

export default App;
