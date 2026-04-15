import { EqualizerState, MixerState, PlaybackContext, Song } from '../types';
import { EmptyPlaybackState } from './EmptyPlaybackState';
import { EqualizerPanel } from './EqualizerPanel';
import { PlaybackControlPanel } from './PlaybackControlPanel';
import { VinylControlCenter } from './VinylControlCenter';

type HomeNowPlayingPanelProps = {
  canGoNext: boolean;
  canGoPrevious: boolean;
  currentTime: number;
  equalizer: EqualizerState;
  playbackContext: PlaybackContext | null;
  playbackDuration: number;
  isPlaying: boolean;
  libraryCount: number;
  mixer: MixerState;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onTogglePlayback: () => void;
  onEqualizerChange: (equalizer: EqualizerState) => void;
  onMixerChange: (mixer: MixerState) => void;
  onVolumeChange: (volume: number) => void;
  playbackQueue: Song[];
  playlistCount: number;
  selectedTrack: Song | null;
  volume: number;
};

export function HomeNowPlayingPanel({
  canGoNext,
  canGoPrevious,
  currentTime,
  equalizer,
  isPlaying,
  libraryCount,
  mixer,
  onNext,
  onEqualizerChange,
  onMixerChange,
  onPrevious,
  onSeek,
  onTogglePlayback,
  onVolumeChange,
  playbackContext,
  playbackDuration,
  playbackQueue,
  playlistCount,
  selectedTrack,
  volume,
}: HomeNowPlayingPanelProps) {
  if (!selectedTrack) {
    return <EmptyPlaybackState libraryCount={libraryCount} playlistCount={playlistCount} />;
  }

  const currentTrackIndex = playbackQueue.findIndex((song) => String(song.id) === String(selectedTrack.id));
  const upcomingTracks =
    currentTrackIndex >= 0 ? playbackQueue.slice(currentTrackIndex + 1, currentTrackIndex + 5) : playbackQueue.slice(1, 5);

  return (
    <main className="main-content home-view home-control-view">
      <section className="hero-card home-control-hero">
        <div className="hero-atmosphere hero-atmosphere-left" />
        <div className="hero-atmosphere hero-atmosphere-right" />
        <section className="home-controller-console">
          <div className="home-console-rail home-console-rail-top" />
          <div className="home-console-rail home-console-rail-bottom" />
          <div className="home-console-divider home-console-divider-left" />
          <div className="home-console-divider home-console-divider-right" />
          <div className="home-dj-layout">
            <section className="home-deck-panel home-left-deck">
            <div className="home-panel-header home-panel-header-deck">
              <div>
                <p className="eyebrow">Deck A</p>
                <h2>Ahora suena</h2>
              </div>
              <span>Activo</span>
            </div>
            <VinylControlCenter isPlaying={isPlaying} song={selectedTrack} />
            <PlaybackControlPanel
              canGoNext={canGoNext}
              canGoPrevious={canGoPrevious}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onNext={onNext}
              onPrevious={onPrevious}
              onSeek={onSeek}
              onTogglePlayback={onTogglePlayback}
              playbackContext={playbackContext}
              playbackDuration={playbackDuration}
              song={selectedTrack}
            />
            </section>
            <EqualizerPanel
              value={equalizer}
              mixer={mixer}
              volume={volume}
              onChange={onEqualizerChange}
              onMixerChange={onMixerChange}
              onVolumeChange={onVolumeChange}
            />
            <section className="home-deck-panel home-right-deck">
              <div className="home-panel-header home-panel-header-deck">
                <div>
                  <p className="eyebrow">Deck B</p>
                  <h2>A continuacion</h2>
                </div>
                <span>{upcomingTracks.length} en cola</span>
              </div>
              <div className="home-queue-list">
                {upcomingTracks.length > 0 ? (
                  upcomingTracks.map((song, index) => (
                    <article
                      key={song.id}
                      className={`home-queue-item${index === 0 ? ' home-queue-item-next' : ''}`}
                    >
                      <div className="home-queue-cover" style={{ background: song.cover }} />
                      <div className="home-queue-copy">
                        <span>{index === 0 ? 'Siguiente' : `Cola ${index + 1}`}</span>
                        <strong>{song.title}</strong>
                        <p>{song.artist}</p>
                      </div>
                      <button
                        className="home-queue-action"
                        type="button"
                        onClick={index === 0 ? onNext : undefined}
                        disabled={index !== 0}
                        aria-label={index === 0 ? `Ir a ${song.title}` : `${song.title} en cola`}
                      >
                        {'>'}
                      </button>
                    </article>
                  ))
                ) : (
                  <div className="home-queue-empty">
                    <p className="eyebrow">Cola</p>
                    <strong>No hay mas canciones</strong>
                    <span>Elige otra playlist o vuelve a la biblioteca para seguir mezclando.</span>
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}
