type MiniPlayerProps = {
  isPlaying: boolean;
  onTogglePlayback: () => void;
};

export function MiniPlayer({ isPlaying, onTogglePlayback }: MiniPlayerProps) {
  return (
    <footer className="mini-player">
      <div className="mini-player-track">
        <div className="mini-player-cover" />
        <div>
          <h3>Título de canción</h3>
          <p>Reproductor base</p>
        </div>
      </div>

      <div className="mini-player-controls">
        <button type="button" onClick={onTogglePlayback}>
          {isPlaying ? 'Pausar' : 'Reproducir'}
        </button>
      </div>
    </footer>
  );
}
