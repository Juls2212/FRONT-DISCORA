import { useEffect, useMemo, useState } from 'react';
import { FullPlayer } from './components/FullPlayer';
import { HomeDjController } from './components/HomeDjController';
import { LibraryView } from './components/LibraryView';
import { MiniPlayer } from './components/MiniPlayer';
import { PlaylistsView } from './components/PlaylistsView';
import { Sidebar } from './components/Sidebar';
import { usePlayback } from './context/PlaybackProvider';
import { getPlaylists, getSongs } from './services/discoraApi';
import { importYouTubePlaylist } from './services/youtubeImport';
import { FrontendPlaylistOverride, Playlist, PlaylistDetail, PlaylistSongEntry, Song, SongPresentationState } from './types';
import { decorateSong, decorateSongs, getSongIdKey } from './utils/songPresentation';
import { needsDurationResolution, resolveSongDuration } from './utils/audio';

type Theme = 'dark' | 'light';
type ViewName = 'home' | 'library' | 'playlists';

const THEME_STORAGE_KEY = 'discora-theme';
const FAVORITES_STORAGE_KEY = 'discora-favorite-song-ids';
const MANUAL_COVERS_STORAGE_KEY = 'discora-manual-cover-by-song-id';
const EMBEDDED_COVERS_STORAGE_KEY = 'discora-embedded-cover-by-song-id';
const YOUTUBE_IMPORTS_STORAGE_KEY = 'discora-youtube-imported-songs';
const YOUTUBE_PLAYLISTS_STORAGE_KEY = 'discora-youtube-imported-playlists';
const PLAYLIST_OVERRIDES_STORAGE_KEY = 'discora-frontend-playlist-overrides';

function readStorageValue<T>(storageKey: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(storageKey);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function buildPlaylistNodeId(playlistId: Playlist['id'], songId: Song['id'], index: number): string {
  return `front:${String(playlistId)}:${String(songId)}:${index}`;
}

function isFrontendPlaylistNode(nodeId: PlaylistSongEntry['nodeId']): boolean {
  return String(nodeId).startsWith('front:');
}

function relinkPlaylistEntries(entries: PlaylistSongEntry[]): PlaylistSongEntry[] {
  return entries.map((entry, index) => ({
    ...entry,
    nextNodeId: index < entries.length - 1 ? entries[index + 1].nodeId : null,
    prevNodeId: index > 0 ? entries[index - 1].nodeId : null,
  }));
}

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
    deckState,
    equalizer,
    isFullPlayerOpen,
    isPlaying,
    mixer,
    nextTrack,
    openFullPlayer,
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
  } = usePlayback();

  const [theme, setTheme] = useState<Theme>('dark');
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [songsLoading, setSongsLoading] = useState(true);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);
  const [songsError, setSongsError] = useState<string | null>(null);
  const [playlistsError, setPlaylistsError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewName>('home');
  const [requestedPlaylistId, setRequestedPlaylistId] = useState<Playlist['id'] | null>(null);
  const [favoriteSongIds, setFavoriteSongIds] = useState<string[]>(() => readStorageArray(FAVORITES_STORAGE_KEY));
  const [manualCoverBySongId, setManualCoverBySongId] = useState<Record<string, string>>(
    () => readStorageRecord(MANUAL_COVERS_STORAGE_KEY),
  );
  const [embeddedCoverBySongId, setEmbeddedCoverBySongId] = useState<Record<string, string>>(
    () => readStorageRecord(EMBEDDED_COVERS_STORAGE_KEY),
  );
  const [youtubeSongs, setYoutubeSongs] = useState<Song[]>(() => {
    try {
      const value = window.localStorage.getItem(YOUTUBE_IMPORTS_STORAGE_KEY);
      return value ? (JSON.parse(value) as Song[]) : [];
    } catch {
      return [];
    }
  });
  const [youtubePlaylists, setYoutubePlaylists] = useState<PlaylistDetail[]>(() => {
    return readStorageValue<PlaylistDetail[]>(YOUTUBE_PLAYLISTS_STORAGE_KEY, []);
  });
  const [playlistOverrides, setPlaylistOverrides] = useState<FrontendPlaylistOverride[]>(() =>
    readStorageValue<FrontendPlaylistOverride[]>(PLAYLIST_OVERRIDES_STORAGE_KEY, []),
  );

  const presentationState = useMemo<SongPresentationState>(
    () => ({
      embeddedCoverBySongId,
      favoriteSongIds,
      manualCoverBySongId,
    }),
    [embeddedCoverBySongId, favoriteSongIds, manualCoverBySongId],
  );

  const mergedSongs = useMemo(() => [...songs, ...youtubeSongs], [songs, youtubeSongs]);
  const mergedPlaylists = useMemo<Playlist[]>(() => {
    const playlistOverridesMap = new Map(playlistOverrides.map((override) => [String(override.playlistId), override]));

    const backendPlaylists = playlists.map((playlist) => {
      const override = playlistOverridesMap.get(String(playlist.id));

      if (!override) {
        return playlist;
      }

      const coverUrl = override.songs.find((entry) => entry.song.backendCoverUrl)?.song.backendCoverUrl ?? playlist.coverUrl;

      return {
        ...playlist,
        coverUrl,
        songCount: override.songs.length,
      };
    });

    return [...backendPlaylists, ...youtubePlaylists];
  }, [playlistOverrides, playlists, youtubePlaylists]);
  const displayedSongs = useMemo(() => decorateSongs(mergedSongs, presentationState), [mergedSongs, presentationState]);
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

  useEffect(() => {
    window.localStorage.setItem(YOUTUBE_IMPORTS_STORAGE_KEY, JSON.stringify(youtubeSongs));
  }, [youtubeSongs]);

  useEffect(() => {
    window.localStorage.setItem(YOUTUBE_PLAYLISTS_STORAGE_KEY, JSON.stringify(youtubePlaylists));
  }, [youtubePlaylists]);

  useEffect(() => {
    window.localStorage.setItem(PLAYLIST_OVERRIDES_STORAGE_KEY, JSON.stringify(playlistOverrides));
  }, [playlistOverrides]);

  const loadSongs = async () => {
    setSongsLoading(true);
    setSongsError(null);

    try {
      const nextSongs = await getSongs();
      setSongs(nextSongs);
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
    syncLibrarySongs(mergedSongs);
  }, [mergedSongs, syncLibrarySongs]);

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
        return nextSongs;
      });
    });

    return () => {
      active = false;
    };
  }, [songs]);

  const handleToggleTheme = () => {
    setTheme((previousTheme) => (previousTheme === 'dark' ? 'light' : 'dark'));
  };

  const handleSongsReload = (nextSongs: Song[]) => {
    setSongs(nextSongs);
  };

  const handleImportYouTubePlaylist = async (playlistUrl: string) => {
    const importedPlaylist = await importYouTubePlaylist(playlistUrl);
    const importedSongs = importedPlaylist.songs;
    const playlistAlreadyExists = youtubePlaylists.some(
      (playlist) => String(playlist.id) === String(importedPlaylist.playlist.id),
    );

    setYoutubeSongs((currentSongs) => {
      const existingIds = new Set(currentSongs.map((song) => String(song.id)));
      const nextSongs = importedSongs.filter((song) => !existingIds.has(String(song.id)));
      return nextSongs.length ? [...currentSongs, ...nextSongs] : currentSongs;
    });

    setYoutubePlaylists((currentPlaylists) => {
      const nextPlaylists = currentPlaylists.filter(
        (playlist) => String(playlist.id) !== String(importedPlaylist.playlist.id),
      );

      return [...nextPlaylists, importedPlaylist.playlist];
    });

    return {
      importedCount: importedSongs.length,
      isNewPlaylist: !playlistAlreadyExists,
      playlistId: importedPlaylist.playlist.id,
      playlistName: importedPlaylist.playlist.name,
      provider: importedPlaylist.provider,
    };
  };

  const handleOpenPlaylistFromImport = (playlistId: Playlist['id']) => {
    setRequestedPlaylistId(playlistId);
    setActiveView('playlists');
  };

  const handleOpenLibrarySearch = () => {
    setActiveView('library');
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('discora:focus-library-search'));
    }, 0);
  };

  const handleRemoveYouTubeSong = (songId: Song['id']) => {
    setYoutubeSongs((currentSongs) => currentSongs.filter((song) => song.id !== songId));
    setYoutubePlaylists((currentPlaylists) =>
      currentPlaylists
        .map((playlist) => {
          const nextSongs = playlist.songs.filter((entry) => entry.song.id !== songId);

          return {
            ...playlist,
            currentNodeId:
              playlist.currentNodeId && !nextSongs.some((entry) => entry.nodeId === playlist.currentNodeId)
                ? null
                : playlist.currentNodeId,
            songCount: nextSongs.length,
            songs: nextSongs.map((entry, index, allSongs) => ({
              ...entry,
              nextNodeId: index < allSongs.length - 1 ? allSongs[index + 1].nodeId : null,
              prevNodeId: index > 0 ? allSongs[index - 1].nodeId : null,
            })),
          };
        })
        .filter((playlist) => playlist.songs.length > 0),
    );
    setPlaylistOverrides((currentOverrides) =>
      currentOverrides
        .map((playlist) => {
          const nextSongs = playlist.songs.filter((entry) => entry.song.id !== songId);
          const normalizedSongs = relinkPlaylistEntries(nextSongs);

          return {
            ...playlist,
            currentNodeId:
              playlist.currentNodeId && !normalizedSongs.some((entry) => entry.nodeId === playlist.currentNodeId)
                ? null
                : playlist.currentNodeId,
            songs: normalizedSongs,
          };
        })
        .filter((playlist) => playlist.songs.length > 0),
    );
  };

  const handleFrontendPlaylistDetailChange = (nextDetail: PlaylistDetail) => {
    if (nextDetail.sourceType === 'youtube') {
      setYoutubePlaylists((currentPlaylists) =>
        currentPlaylists.map((playlist) => (String(playlist.id) === String(nextDetail.id) ? nextDetail : playlist)),
      );
      return;
    }

    setPlaylistOverrides((currentOverrides) => {
      const nextOverride: FrontendPlaylistOverride = {
        currentNodeId: nextDetail.currentNodeId,
        playlistId: nextDetail.id,
        songs: nextDetail.songs,
      };
      const nextOverrides = currentOverrides.filter((playlist) => String(playlist.playlistId) !== String(nextDetail.id));
      return [...nextOverrides, nextOverride];
    });
  };

  const handleResolveFrontendPlaylistDetail = (playlistId: Playlist['id'], baseDetail: PlaylistDetail) => {
    const override = playlistOverrides.find((entry) => String(entry.playlistId) === String(playlistId));

    if (!override) {
      return baseDetail;
    }

    const localSongs = override.songs.filter((entry) => isFrontendPlaylistNode(entry.nodeId));
    const mergedSongs = [...baseDetail.songs.map((entry) => entry.song), ...localSongs.map((entry) => entry.song)];
    const normalizedSongs = relinkPlaylistEntries([...baseDetail.songs, ...localSongs]);

    return {
      ...baseDetail,
      currentNodeId:
        override.currentNodeId && normalizedSongs.some((entry) => entry.nodeId === override.currentNodeId)
          ? override.currentNodeId
          : baseDetail.currentNodeId,
      coverUrl: mergedSongs.find((song) => song.backendCoverUrl)?.backendCoverUrl ?? baseDetail.coverUrl,
      songCount: normalizedSongs.length,
      songs: normalizedSongs,
    };
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
          playlists={mergedPlaylists}
          playlistsError={mergedPlaylists.length > 0 ? null : playlistsError}
          playlistsLoading={playlistsLoading && youtubePlaylists.length === 0}
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
              onImportYouTubePlaylist={handleImportYouTubePlaylist}
              onOpenImportedPlaylist={handleOpenPlaylistFromImport}
              onPlayTrack={playTrack}
              onRemoveYouTubeSong={handleRemoveYouTubeSong}
              onSongsReload={handleSongsReload}
              onToggleFavorite={handleToggleFavorite}
              unavailableSongIds={unavailableSongIds}
              youtubeSongs={youtubeSongs}
            />
          ) : activeView === 'playlists' ? (
            <PlaylistsView
              embeddedCoverBySongId={embeddedCoverBySongId}
              favoriteSongIds={favoriteSongIds}
              manualCoverBySongId={manualCoverBySongId}
              onFrontendPlaylistDetailChange={handleFrontendPlaylistDetailChange}
              playlists={mergedPlaylists}
              playlistsError={mergedPlaylists.length > 0 ? null : playlistsError}
              playlistsLoading={playlistsLoading && youtubePlaylists.length === 0}
              requestedPlaylistId={requestedPlaylistId}
              songs={displayedSongs}
              onPlayTrack={playTrack}
              onRefreshPlaylists={loadPlaylists}
              onResolveFrontendPlaylistDetail={handleResolveFrontendPlaylistDetail}
              onRequestHandled={() => setRequestedPlaylistId(null)}
              onToggleFavorite={handleToggleFavorite}
              unavailableSongIds={unavailableSongIds}
            />
          ) : (
            <HomeDjController
              canGoNext={canGoNext}
              canGoPrevious={canGoPrevious}
              currentTime={currentTime}
              deckState={deckState}
              isPlaying={isPlaying}
              mixer={mixer}
              onNext={nextTrack}
              onOpenLibrarySearch={handleOpenLibrarySearch}
              onMixerChange={setMixer}
              onPrevious={previousTrack}
              onSetCuePoint={setCuePoint}
              onSetDeckState={setDeckState}
              onSeek={seekTo}
              onTogglePlayback={togglePlayback}
              onToggleLoop={toggleLoop}
              onVolumeChange={setVolume}
              playbackContext={playbackContext}
              playbackDuration={playbackDuration}
              playbackQueue={playbackQueue}
              selectedTrack={displayedSelectedTrack}
              volume={volume}
            />
          )}
        </div>
      </div>
      {activeView !== 'home' ? (
        <MiniPlayer
          currentTime={currentTime}
          isPlaying={isPlaying}
          onOpenFullPlayer={openFullPlayer}
          onSeek={seekTo}
          onTogglePlayback={togglePlayback}
          playbackError={playbackError}
          playbackContext={playbackContext}
          playbackDuration={playbackDuration}
          selectedTrack={displayedSelectedTrack}
        />
      ) : null}
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
        playbackError={playbackError}
        playbackContext={playbackContext}
        playbackDuration={playbackDuration}
        selectedTrack={displayedSelectedTrack}
      />
    </div>
  );
}

export default App;
