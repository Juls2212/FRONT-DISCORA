import { PlaybackContext, Song } from '../types';
import { getCoverSurfaceStyle } from '../utils/songPresentation';

type MiniPlayerProps = {
  currentTime: number;
  isPlaying: boolean;
  onOpenFullPlayer: () => void;
  onSeek: (time: number) => void;
  onTogglePlayback: () => void;
  playbackContext: PlaybackContext | null;
  playbackDuration: number;
  selectedTrack: Song | null;
};

function formatPlaybackTime(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function MiniPlayer({
  currentTime,
  isPlaying,
  onOpenFullPlayer,
  onSeek,
  onTogglePlayback,
  playbackContext,
  playbackDuration,
  selectedTrack,
}: MiniPlayerProps) {
  const progressMax = playbackDuration > 0 ? playbackDuration : 0;
  const progressValue = progressMax > 0 ? Math.min(currentTime, progressMax) : 0;
  const playbackLabel =
    playbackContext?.type === 'playlist'
      ? `Sonando desde ${playbackContext.playlistName}`
      : selectedTrack
        ? 'Reproduciendo ahora'
        : 'Sin seleccion';

  return (
    <footer className="mini-player">
      <button className="mini-player-track mini-player-track-button" type="button" onClick={onOpenFullPlayer}>
        <div
          className="mini-player-cover"
          style={getCoverSurfaceStyle(selectedTrack?.cover)}
        >
          <div className="mini-player-ring" />
        </div>
        <div>
          <span className="mini-player-label">{playbackLabel}</span>
          <h3>{selectedTrack?.title ?? 'Selecciona una cancion'}</h3>
          <p>{selectedTrack ? `${selectedTrack.artist} - ${selectedTrack.duration}` : 'Discora conectada al backend'}</p>
        </div>
      </button>

      <div className="mini-player-center">
        <div className="mini-player-controls">
          <button
            className="mini-player-primary-icon"
            type="button"
            onClick={onTogglePlayback}
            disabled={!selectedTrack}
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            title={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            <span aria-hidden="true">{isPlaying ? '||' : '>'}</span>
          </button>
        </div>
        <div className="mini-player-progress">
          <span>{formatPlaybackTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={progressMax}
            step={1}
            value={progressValue}
            onChange={(event) => onSeek(Number(event.target.value))}
            disabled={!selectedTrack || progressMax === 0}
            aria-label="Progreso de reproduccion"
          />
          <span>{playbackDuration > 0 ? formatPlaybackTime(playbackDuration) : selectedTrack?.duration ?? '0:00'}</span>
        </div>
      </div>

      <div className="mini-player-meta">
        <span className="mini-player-context">
          {playbackContext?.type === 'playlist' ? 'Contexto de playlist activo' : 'Biblioteca activa'}
        </span>
        <p>{selectedTrack ? selectedTrack.artist : 'Selecciona una cancion para comenzar'}</p>
      </div>
    </footer>
  );
}
