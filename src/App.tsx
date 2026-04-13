import { useState } from 'react';
import { MainContent } from './components/MainContent';
import { MiniPlayer } from './components/MiniPlayer';
import { Sidebar } from './components/Sidebar';
import { VinylPlayer } from './components/VinylPlayer';
import { songs } from './data';
import { Song } from './types';

function App() {
  const [currentSong, setCurrentSong] = useState<Song | null>(songs[1]);
  const [isPlaying, setIsPlaying] = useState(true);

  const handlePlaySong = (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
  };

  const handleTogglePlayback = () => {
    if (!currentSong) {
      return;
    }

    setIsPlaying((previousState) => !previousState);
  };

  return (
    <div className="app-shell">
      <div className="app-layout">
        <Sidebar />
        <div className="content-shell">
          <MainContent currentSong={currentSong} onPlaySong={handlePlaySong} />
          {currentSong ? <VinylPlayer song={currentSong} isPlaying={isPlaying} /> : null}
        </div>
      </div>
      <MiniPlayer currentSong={currentSong} isPlaying={isPlaying} onTogglePlayback={handleTogglePlayback} />
    </div>
  );
}

export default App;
