import { useEffect, useMemo, useState } from 'react';
import { FullPlayer } from './components/FullPlayer';
import { LibraryView } from './components/LibraryView';
import { MainContent } from './components/MainContent';
import { MiniPlayer } from './components/MiniPlayer';
import { PlaylistsView } from './components/PlaylistsView';
import { Sidebar } from './components/Sidebar';
import { usePlayback } from './context/PlaybackProvider';
import { getPlaylists, getSongs } from './services/discoraApi';
import { Playlist, Song, SongPresentationState } from './types';
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
  const {
    canGoNext,
    canGoPrevious,
    closeFullPlayer,
    currentTime,
    equalizer,
    isFullPlayerOpen,
    isPlaying,
    nextTrack,
    openFullPlayer,
    playbackContext,
    playbackDuration,
    playTrack,
    previousTrack,
    setEqualizer,
    setVolume,
    seekTo,
    selectedTrack,
    syncLibrarySongs,
    togglePlayback,
    volume,
  } = usePlayback();

  const [theme, setTheme] = useState<Theme>('dark');
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [songsLoading, setSongsLoading] = useState(true);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);
  const [songsError, setSongsError] = useState<string | null>(null);
  const [playlistsError, setPlaylistsError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewName>('home');
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
      syncLibrarySongs(nextSongs);
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

      setSongs((currentSongs) => {
        const nextSongs = currentSongs.map((song) =>
          resolvedDurations.has(song.id)
            ? { ...song, duration: resolvedDurations.get(song.id) ?? song.duration }
            : song,
        );
        syncLibrarySongs(nextSongs);
        return nextSongs;
      });
    });

    return () => {
      active = false;
    };
  }, [songs, syncLibrarySongs]);

  const handleToggleTheme = () => {
    setTheme((previousTheme) => (previousTheme === 'dark' ? 'light' : 'dark'));
  };

  const handleSongsReload = (nextSongs: Song[]) => {
    setSongs(nextSongs);
    syncLibrarySongs(nextSongs);
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
              onPlayTrack={playTrack}
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
              onPlayTrack={playTrack}
              onRefreshPlaylists={loadPlaylists}
              onToggleFavorite={handleToggleFavorite}
            />
          ) : (
            <MainContent
              canGoNext={canGoNext}
              canGoPrevious={canGoPrevious}
              currentTime={currentTime}
              equalizer={equalizer}
              isPlaying={isPlaying}
              onNext={nextTrack}
              onPlayTrack={playTrack}
              onEqualizerChange={setEqualizer}
              onPrevious={previousTrack}
              onSeek={seekTo}
              onTogglePlayback={togglePlayback}
              onVolumeChange={setVolume}
              playbackContext={playbackContext}
              playbackDuration={playbackDuration}
              playlistsCount={playlists.length}
              selectedTrack={displayedSelectedTrack}
              songs={displayedSongs}
              volume={volume}
            />
          )}
        </div>
      </div>
      <MiniPlayer
        currentTime={currentTime}
        isPlaying={isPlaying}
        onOpenFullPlayer={openFullPlayer}
        onSeek={seekTo}
        onTogglePlayback={togglePlayback}
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
        onClose={closeFullPlayer}
        onNext={nextTrack}
        onPrevious={previousTrack}
        onSeek={seekTo}
        onToggleFavorite={() => {
          if (displayedSelectedTrack) {
            handleToggleFavorite(displayedSelectedTrack.id);
          }
        }}
        onTogglePlayback={togglePlayback}
        playbackContext={playbackContext}
        playbackDuration={playbackDuration}
        selectedTrack={displayedSelectedTrack}
      />
    </div>
  );
}

export default App;
