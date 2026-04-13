import { Song } from '../types';

type MiniPlayerProps = {
  isPlaying: boolean;
  onTogglePlayback: () => void;
  selectedTrack: Song | null;
};

export function MiniPlayer({ isPlaying, onTogglePlayback, selectedTrack }: MiniPlayerProps) {
  return (
    <footer className="mini-player">
      <div className="mini-player-track">
        <div
          className="mini-player-cover"
          style={{
            background:
              selectedTrack?.cover ?? 'linear-gradient(145deg, #52627d 0%, #202739 100%)',
          }}
        >
          <div className="mini-player-ring" />
        </div>
        <div>
          <span className="mini-player-label">
            {selectedTrack ? 'Ahora en espera' : 'Sin seleccion'}
          </span>
          <h3>{selectedTrack?.title ?? 'Selecciona una cancion'}</h3>
          <p>{selectedTrack ? `${selectedTrack.artist} · ${selectedTrack.album}` : 'Discora conectada al backend'}</p>
        </div>
      </div>

      <div className="mini-player-controls">
        <button className="player-secondary-button" type="button" aria-label="Anterior">
          {'<'}
        </button>
        <button type="button" onClick={onTogglePlayback} disabled={!selectedTrack}>
          {isPlaying ? 'Pausar' : 'Reproducir'}
        </button>
        <button className="player-secondary-button" type="button" aria-label="Siguiente">
          {'>'}
        </button>
      </div>
    </footer>
  );
}
