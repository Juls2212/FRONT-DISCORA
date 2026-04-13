import { useEffect, useRef, useState } from 'react';
import { LibraryView } from './components/LibraryView';
import { MainContent } from './components/MainContent';
import { MiniPlayer } from './components/MiniPlayer';
import { PlaylistsView } from './components/PlaylistsView';
import { Sidebar } from './components/Sidebar';
import { getPlaylists, getSongs } from './services/discoraApi';
import { Playlist, Song } from './types';
import { needsDurationResolution, resolveSongDuration } from './utils/audio';

type Theme = 'dark' | 'light';
type ViewName = 'home' | 'library' | 'playlists';

const THEME_STORAGE_KEY = 'discora-theme';

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
      setIsPlaying(false);
    };

    const handleError = () => {
      console.error('Discora playback error', {
        audioUrl: audio.currentSrc,
        selectedTrack,
      });
      setIsPlaying(false);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [selectedTrack]);

  useEffect(() => {
    let active = true;

    const loadSongs = async () => {
      setSongsLoading(true);
      setSongsError(null);

      try {
        const nextSongs = await getSongs();

        if (!active) {
          return;
        }

        setSongs(nextSongs);
        setSelectedTrack((currentTrack) => currentTrack ?? nextSongs[0] ?? null);
      } catch {
        if (active) {
          setSongsError('No se pudieron cargar las canciones.');
        }
      } finally {
        if (active) {
          setSongsLoading(false);
        }
      }
    };

    const loadPlaylists = async () => {
      setPlaylistsLoading(true);
      setPlaylistsError(null);

      try {
        const nextPlaylists = await getPlaylists();

        if (!active) {
          return;
        }

        setPlaylists(nextPlaylists);
      } catch {
        if (active) {
          setPlaylistsError('No se pudieron cargar las playlists.');
        }
      } finally {
        if (active) {
          setPlaylistsLoading(false);
        }
      }
    };

    void loadSongs();
    void loadPlaylists();

    return () => {
      active = false;
    };
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
          .filter((result): result is PromiseFulfilledResult<{ duration: string; id: Song['id'] }> => result.status === 'fulfilled')
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
      return;
    }

    if (audio.src !== selectedTrack.audioUrl) {
      audio.src = selectedTrack.audioUrl;
      audio.load();
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
    if (!selectedTrack) {
      return;
    }

    setIsPlaying((previousState) => !previousState);
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
            <LibraryView onSelectTrack={setSelectedTrack} onSongsReload={handleSongsReload} />
          ) : activeView === 'playlists' ? (
            <PlaylistsView
              playlists={playlists}
              playlistsError={playlistsError}
              playlistsLoading={playlistsLoading}
              onSelectTrack={setSelectedTrack}
            />
          ) : (
            <MainContent
              playlists={playlists}
              playlistsError={playlistsError}
              playlistsLoading={playlistsLoading}
              songs={songs}
              songsError={songsError}
              songsLoading={songsLoading}
            />
          )}
        </div>
      </div>
      <MiniPlayer
        isPlaying={isPlaying}
        onTogglePlayback={handleTogglePlayback}
        selectedTrack={selectedTrack}
      />
    </div>
  );
}

export default App;
