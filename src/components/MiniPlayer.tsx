import { Song } from '../types';

type MiniPlayerProps = {
  currentSong: Song | null;
  isPlaying: boolean;
  onTogglePlayback: () => void;
};

export function MiniPlayer({ currentSong, isPlaying, onTogglePlayback }: MiniPlayerProps) {
  return (
    <footer className="mini-player">
      <div className="mini-player-track">
        <div
          className="mini-player-cover"
          style={{ background: currentSong?.cover ?? 'linear-gradient(135deg, #2f3e46 0%, #0b090a 100%)' }}
        />
        <div>
          <h3>{currentSong?.title ?? 'Selecciona una canción'}</h3>
          <p>{currentSong ? `${currentSong.artist} · ${currentSong.album}` : 'Discora está listo para sonar'}</p>
        </div>
      </div>

      <div className="mini-player-controls">
        <button type="button" onClick={onTogglePlayback} disabled={!currentSong}>
          {isPlaying ? 'Pausar' : 'Reproducir'}
        </button>
      </div>
    </footer>
  );
}
