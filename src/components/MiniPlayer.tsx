import { playerTrack } from '../data';

type MiniPlayerProps = {
  isPlaying: boolean;
  onTogglePlayback: () => void;
};

export function MiniPlayer({ isPlaying, onTogglePlayback }: MiniPlayerProps) {
  return (
    <footer className="mini-player">
      <div className="mini-player-track">
        <div className="mini-player-cover" style={{ background: playerTrack.cover }}>
          <div className="mini-player-ring" />
        </div>
        <div>
          <span className="mini-player-label">Ahora en espera</span>
          <h3>{playerTrack.title}</h3>
          <p>
            {playerTrack.artist} · {playerTrack.album}
          </p>
        </div>
      </div>

      <div className="mini-player-controls">
        <button className="player-secondary-button" type="button" aria-label="Anterior">
          {'<'}
        </button>
        <button type="button" onClick={onTogglePlayback}>
          {isPlaying ? 'Pausar' : 'Reproducir'}
        </button>
        <button className="player-secondary-button" type="button" aria-label="Siguiente">
          {'>'}
        </button>
      </div>
    </footer>
  );
}
