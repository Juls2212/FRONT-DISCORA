import { useEffect, useState } from 'react';
import { MainContent } from './components/MainContent';
import { MiniPlayer } from './components/MiniPlayer';
import { Sidebar } from './components/Sidebar';
import { getPlaylists, getSongs } from './services/discoraApi';
import { Playlist, Song } from './types';

type Theme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'discora-theme';

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [songsLoading, setSongsLoading] = useState(true);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);
  const [songsError, setSongsError] = useState<string | null>(null);
  const [playlistsError, setPlaylistsError] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Song | null>(null);

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

  const handleTogglePlayback = () => {
    if (!selectedTrack) {
      return;
    }

    setIsPlaying((previousState) => !previousState);
  };

  const handleToggleTheme = () => {
    setTheme((previousTheme) => (previousTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="app-shell">
      <div className="app-layout">
        <Sidebar
          playlists={playlists}
          playlistsError={playlistsError}
          playlistsLoading={playlistsLoading}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
        <div className="content-shell">
          <MainContent
            playlists={playlists}
            playlistsError={playlistsError}
            playlistsLoading={playlistsLoading}
            songs={songs}
            songsError={songsError}
            songsLoading={songsLoading}
          />
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
