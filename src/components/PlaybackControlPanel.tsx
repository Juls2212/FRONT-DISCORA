import { PlaybackContext, Song } from '../types';
import { formatPlaybackTime } from '../utils/playerPresentation';

type PlaybackControlPanelProps = {
  canGoNext: boolean;
  canGoPrevious: boolean;
  currentTime: number;
  isPlaying: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onTogglePlayback: () => void;
  playbackContext: PlaybackContext | null;
  playbackDuration: number;
  song: Song;
};

export function PlaybackControlPanel({
  canGoNext,
  canGoPrevious,
  currentTime,
  isPlaying,
  onNext,
  onPrevious,
  onSeek,
  onTogglePlayback,
  playbackContext,
  playbackDuration,
  song,
}: PlaybackControlPanelProps) {
  const progressMax = playbackDuration > 0 ? playbackDuration : 0;
  const progressValue = progressMax > 0 ? Math.min(currentTime, progressMax) : 0;
  const sourceLabel =
    playbackContext?.type === 'playlist'
      ? `Desde ${playbackContext.playlistName}`
      : 'Desde tu biblioteca';

  return (
    <section className="home-control-panel home-transport-panel">
      <div className="home-song-copy">
        <p className="eyebrow">Canal activo</p>
        <h1>{song.title}</h1>
        <p className="home-song-artist">{song.artist}</p>
        <span className="home-source-badge">{sourceLabel}</span>
      </div>

      <div className="home-transport-controls">
        <button
          className="home-icon-button"
          type="button"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          aria-label="Anterior"
        >
          <span aria-hidden="true">{'<<'}</span>
        </button>
        <button
          className="home-play-button"
          type="button"
          onClick={onTogglePlayback}
          aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          <span aria-hidden="true">{isPlaying ? '||' : '>'}</span>
        </button>
        <button
          className="home-icon-button"
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="Siguiente"
        >
          <span aria-hidden="true">{'>>'}</span>
        </button>
      </div>

      <div className="home-progress-panel">
        <div className="home-progress-meta">
          <span>{formatPlaybackTime(currentTime)}</span>
          <span>{playbackDuration > 0 ? formatPlaybackTime(playbackDuration) : song.duration}</span>
        </div>
        <input
          type="range"
          min={0}
          max={progressMax}
          step={1}
          value={progressValue}
          onChange={(event) => onSeek(Number(event.target.value))}
          disabled={progressMax === 0}
          aria-label="Progreso de reproduccion"
        />
      </div>
    </section>
  );
}
