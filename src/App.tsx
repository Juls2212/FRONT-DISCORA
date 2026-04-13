import { useEffect, useState } from 'react';
import { MainContent } from './components/MainContent';
import { MiniPlayer } from './components/MiniPlayer';
import { Sidebar } from './components/Sidebar';

type Theme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'discora-theme';

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');

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

  const handleTogglePlayback = () => {
    setIsPlaying((previousState) => !previousState);
  };

  const handleToggleTheme = () => {
    setTheme((previousTheme) => (previousTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="app-shell">
      <div className="app-layout">
        <Sidebar theme={theme} onToggleTheme={handleToggleTheme} />
        <div className="content-shell">
          <MainContent />
        </div>
      </div>
      <MiniPlayer isPlaying={isPlaying} onTogglePlayback={handleTogglePlayback} />
    </div>
  );
}

export default App;
