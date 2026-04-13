import { useState } from 'react';
import { MainContent } from './components/MainContent';
import { MiniPlayer } from './components/MiniPlayer';
import { Sidebar } from './components/Sidebar';

function App() {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleTogglePlayback = () => {
    setIsPlaying((previousState) => !previousState);
  };

  return (
    <div className="app-shell">
      <div className="app-layout">
        <Sidebar />
        <div className="content-shell">
          <MainContent />
        </div>
      </div>
      <MiniPlayer isPlaying={isPlaying} onTogglePlayback={handleTogglePlayback} />
    </div>
  );
}

export default App;
