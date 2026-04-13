import { PlaybackContext, Song } from '../types';

type FullPlayerProps = {
  currentTime: number;
  isOpen: boolean;
  isPlaying: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onTogglePlayback: () => void;
  playbackContext: PlaybackContext | null;
  playbackDuration: number;
  selectedTrack: Song | null;
  canGoNext: boolean;
  canGoPrevious: boolean;
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

function getArtworkBackground(cover: string | undefined): string {
  if (!cover) {
    return 'linear-gradient(145deg, #52627d 0%, #202739 100%)';
  }

  const normalized = cover.trim();

  if (
    normalized.startsWith('linear-gradient') ||
    normalized.startsWith('radial-gradient') ||
    normalized.startsWith('conic-gradient')
  ) {
    return normalized;
  }

  return `url("${normalized}") center / cover no-repeat`;
}

export function FullPlayer({
  canGoNext,
  canGoPrevious,
  currentTime,
  isOpen,
  isPlaying,
  onClose,
  onNext,
  onPrevious,
  onSeek,
  onTogglePlayback,
  playbackContext,
  playbackDuration,
  selectedTrack,
}: FullPlayerProps) {
  const progressMax = playbackDuration > 0 ? playbackDuration : 0;
  const progressValue = progressMax > 0 ? Math.min(currentTime, progressMax) : 0;
  const artworkBackground = getArtworkBackground(selectedTrack?.cover);
  const contextCopy =
    playbackContext?.type === 'playlist'
      ? `Escuchando desde ${playbackContext.playlistName}`
      : 'Escuchando desde tu biblioteca';

  return (
    <div className={`full-player${isOpen ? ' full-player-open' : ''}`} aria-hidden={!isOpen}>
      <div className="full-player-backdrop" onClick={onClose} />
      <section className="full-player-panel">
        <div className="full-player-atmosphere" style={{ background: artworkBackground }} />
        <button className="full-player-close" type="button" onClick={onClose}>
          Cerrar
        </button>

        <div className="full-player-content">
          <div className="full-player-vinyl-stage">
            <div className={`full-player-vinyl${isPlaying ? ' full-player-vinyl-spinning' : ''}`}>
              <div className="full-player-vinyl-sheen" />
              <div className="full-player-vinyl-groove groove-one" />
              <div className="full-player-vinyl-groove groove-two" />
              <div className="full-player-vinyl-groove groove-three" />
              <div className="full-player-center-art" style={{ background: artworkBackground }}>
                <div className="full-player-center-core" />
              </div>
            </div>
          </div>

          <div className="full-player-info">
            <span className="full-player-kicker">{contextCopy}</span>
            <h2>{selectedTrack?.title ?? 'Selecciona una cancion'}</h2>
            <p>{selectedTrack?.artist ?? 'Discora lista para reproducir'}</p>

            <div className="full-player-progress">
              <div className="full-player-progress-header">
                <span>{formatPlaybackTime(currentTime)}</span>
                <span>{playbackDuration > 0 ? formatPlaybackTime(playbackDuration) : selectedTrack?.duration ?? '0:00'}</span>
              </div>
              <input
                type="range"
                min={0}
                max={progressMax}
                step={1}
                value={progressValue}
                onChange={(event) => onSeek(Number(event.target.value))}
                disabled={!selectedTrack || progressMax === 0}
                aria-label="Progreso del reproductor completo"
              />
            </div>

            <div className="full-player-controls">
              <button className="player-secondary-button" type="button" onClick={onPrevious} disabled={!canGoPrevious}>
                Anterior
              </button>
              <button className="full-player-primary" type="button" onClick={onTogglePlayback} disabled={!selectedTrack}>
                {isPlaying ? 'Pausar' : 'Reproducir'}
              </button>
              <button className="player-secondary-button" type="button" onClick={onNext} disabled={!canGoNext}>
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
