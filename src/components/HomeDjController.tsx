import { useMemo, useState } from 'react';
import { DeckState, EqualizerState, MixerState, PlaybackContext, Song } from '../types';
import { formatPlaybackTime, getArtworkBackground } from '../utils/playerPresentation';

type HomeDjControllerProps = {
  canGoNext: boolean;
  canGoPrevious: boolean;
  currentTime: number;
  deckState: DeckState;
  equalizer: EqualizerState;
  isPlaying: boolean;
  mixer: MixerState;
  onEqualizerChange: (equalizer: EqualizerState) => void;
  onNext: () => void;
  onOpenLibrarySearch: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onSetCuePoint: (time?: number) => void;
  onSetDeckState: (deckState: DeckState) => void;
  onTogglePlayback: () => void;
  onToggleLoop: () => void;
  onMixerChange: (mixer: MixerState) => void;
  onVolumeChange: (volume: number) => void;
  playbackContext: PlaybackContext | null;
  playbackDuration: number;
  playbackQueue: Song[];
  selectedTrack: Song | null;
  volume: number;
};

export function HomeDjController({
  canGoNext,
  canGoPrevious,
  currentTime,
  deckState,
  equalizer,
  isPlaying,
  mixer,
  onEqualizerChange,
  onNext,
  onOpenLibrarySearch,
  onPrevious,
  onSeek,
  onSetCuePoint,
  onSetDeckState,
  onTogglePlayback,
  onToggleLoop,
  onMixerChange,
  onVolumeChange,
  playbackContext,
  playbackDuration,
  playbackQueue,
  selectedTrack,
  volume,
}: HomeDjControllerProps) {
  const [samplerOpen, setSamplerOpen] = useState(false);
  const [effectsOpen, setEffectsOpen] = useState(false);
  const waveformBars = useMemo(
    () =>
      Array.from({ length: 20 }, (_, index) => {
        const centerWeight = 1 - Math.abs(index - 9.5) / 10;
        const base = 18 + centerWeight * 20;
        const pulse = isPlaying ? ((Math.sin(currentTime * 3.8 + index * 0.65) + 1) / 2) * (20 + centerWeight * 26) : 6 + centerWeight * 8;
        return Math.min(92, base + pulse);
      }),
    [currentTime, isPlaying],
  );
  const mixerLights = useMemo(
    () =>
      Array.from({ length: 10 }, (_, index) => {
        const pulse = isPlaying ? ((Math.sin(currentTime * 4.2 + index * 0.75) + 1) / 2) * 100 : 10 + index * 4;
        return Math.min(100, pulse);
      }),
    [currentTime, isPlaying],
  );

  if (!selectedTrack) {
    return (
      <main className="main-content home-view">
        <section className="hero-card dj-home-shell dj-home-shell-empty">
          <div className="dj-home-empty-copy">
            <p className="eyebrow">Control Center</p>
            <h1>Selecciona musica para activar la cabina.</h1>
            <p>Elige una cancion desde biblioteca o playlists para abrir la superficie principal de Discora.</p>
          </div>
        </section>
      </main>
    );
  }

  const progressMax = playbackDuration > 0 ? playbackDuration : 0;
  const progressValue = progressMax > 0 ? Math.min(currentTime, progressMax) : 0;
  const currentTrackIndex = playbackQueue.findIndex((song) => String(song.id) === String(selectedTrack.id));
  const queueTracks =
    currentTrackIndex >= 0 ? playbackQueue.slice(currentTrackIndex + 1, currentTrackIndex + 6) : playbackQueue.slice(1, 6);
  const sourceLabel =
    playbackContext?.type === 'playlist' ? `Desde ${playbackContext.playlistName}` : 'Desde tu biblioteca';
  const deckBackground = getArtworkBackground(selectedTrack.cover);
  const deckAWeight = Math.max(0, 1 - mixer.crossfader / 100);
  const deckBWeight = Math.max(0, mixer.crossfader / 100);
  const playbackStateLabel = isPlaying ? 'En reproduccion' : 'En pausa';
  const collectionLabel = selectedTrack.album?.trim() || 'Sin coleccion visible';

  const handleLoadDeck = () => {
    onSeek(deckState.cuePoint ?? 0);
  };

  const handleCue = () => {
    onSeek(deckState.cuePoint ?? 0);
  };

  return (
    <main className="main-content home-view">
      <section className="hero-card dj-home-shell">
        <div className="dj-home-glow dj-home-glow-left" />
        <div className="dj-home-glow dj-home-glow-right" />
        <div className="dj-home-console dj-home-console-simple">
          <section className="dj-home-deck dj-home-deck-a dj-home-deck-simple">
            <div className="dj-home-deck-header">
              <div>
                <p className="eyebrow">Deck A</p>
                <strong>Reproduccion</strong>
              </div>
              <div className="dj-home-chip-row">
                <button type="button" className="dj-home-chip-button" onClick={handleLoadDeck}>
                  Load
                </button>
                <button type="button" className="dj-home-chip-button" onClick={handleCue}>
                  Cue
                </button>
                <button
                  type="button"
                  className={`dj-home-chip-button${deckState.loopEnabled ? ' dj-home-chip-button-active' : ''}`}
                  onClick={onToggleLoop}
                >
                  Loop
                </button>
              </div>
            </div>

            <div className="dj-home-platter-panel">
              <div className="dj-home-platter-backdrop" style={{ background: deckBackground }} />
              <div className={`dj-home-platter dj-home-platter-compact${isPlaying ? ' dj-home-platter-spinning' : ''}`}>
                <div className="dj-home-platter-rim" />
                <div className="dj-home-platter-ring dj-home-platter-ring-one" />
                <div className="dj-home-platter-ring dj-home-platter-ring-two" />
                <div className="dj-home-platter-label" style={{ background: deckBackground }}>
                  <div className="dj-home-platter-core" />
                </div>
              </div>
            </div>

            <div className="dj-home-meter">
              {waveformBars.map((height, index) => (
                <span
                  key={`${index}-${height}`}
                  className={`dj-home-meter-bar${isPlaying ? ' dj-home-meter-bar-active' : ''}`}
                  style={{ height: `${height}%`, animationDelay: `${index * 32}ms` }}
                />
              ))}
            </div>

            <div className="dj-home-track-card">
              <span>{sourceLabel}</span>
              <h2>{selectedTrack.title}</h2>
              <p>{selectedTrack.artist}</p>
            </div>

            <div className="dj-home-transport dj-home-transport-compact">
              <div className="dj-home-transport-buttons">
                <button type="button" className="dj-home-icon-button" onClick={onPrevious} disabled={!canGoPrevious} aria-label="Anterior">
                  <span aria-hidden="true">{'<<'}</span>
                </button>
                <button type="button" className="dj-home-play-button" onClick={onTogglePlayback} aria-label={isPlaying ? 'Pausar' : 'Reproducir'}>
                  <span aria-hidden="true">{isPlaying ? '||' : '>'}</span>
                </button>
                <button type="button" className="dj-home-icon-button" onClick={onNext} disabled={!canGoNext} aria-label="Siguiente">
                  <span aria-hidden="true">{'>>'}</span>
                </button>
              </div>
              <div className="dj-home-progress">
                <div className="dj-home-progress-meta">
                  <span>{formatPlaybackTime(currentTime)}</span>
                  <span>{playbackDuration > 0 ? formatPlaybackTime(playbackDuration) : selectedTrack.duration}</span>
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
            </div>

            <div className="dj-home-status-panel">
              <div className="dj-home-status-art" style={{ background: deckBackground }} aria-hidden="true">
                <div className="dj-home-status-art-glow" />
              </div>
              <div className="dj-home-status-copy">
                <div className="dj-home-status-grid">
                  <article>
                    <span>Fuente</span>
                    <strong>{sourceLabel}</strong>
                  </article>
                  <article>
                    <span>Estado</span>
                    <strong>{playbackStateLabel}</strong>
                  </article>
                  <article>
                    <span>Artista</span>
                    <strong>{selectedTrack.artist}</strong>
                  </article>
                  <article>
                    <span>Coleccion</span>
                    <strong>{collectionLabel}</strong>
                  </article>
                </div>
                <div className="dj-home-status-tags">
                  <span>{selectedTrack.sourceType === 'youtube' ? 'YouTube' : 'Discora'}</span>
                  <span>{deckState.loopEnabled ? 'Loop activo' : 'Loop libre'}</span>
                  <span>{deckState.vinylMode ? 'Modo vinilo' : 'Modo digital'}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="dj-home-mixer dj-home-mixer-simple">
            <div className="dj-home-deck-header dj-home-deck-header-center">
              <div>
                <p className="eyebrow">Mixer</p>
                <strong>Control</strong>
              </div>
            </div>

            <div className="dj-home-mixer-cluster">
              <div className="dj-home-mixer-lights" aria-hidden="true">
                {mixerLights.map((level, index) => (
                  <span
                    key={`left-${index}`}
                    className={`dj-home-led${level > 48 ? ' dj-home-led-active' : ''}${level > 76 ? ' dj-home-led-hot' : ''}`}
                    style={{ opacity: `${Math.max(0.22, level / 100)}` }}
                  />
                ))}
              </div>

              <div className="dj-home-mixer-core">
                <div className="dj-home-mixer-sliders dj-home-mixer-sliders-restored">
                  <label className="dj-home-mixer-strip">
                    <span>Master</span>
                    <input
                      className="dj-home-mixer-slider"
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(volume * 100)}
                      onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
                      aria-label="Volumen master"
                    />
                    <strong>{Math.round(volume * 100)}</strong>
                  </label>
                  <label className="dj-home-mixer-strip">
                    <span>Bass</span>
                    <input
                      className="dj-home-mixer-slider"
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={equalizer.bass}
                      onChange={(event) => onEqualizerChange({ ...equalizer, bass: Number(event.target.value) })}
                      aria-label="Graves"
                    />
                    <strong>{equalizer.bass}</strong>
                  </label>
                  <label className="dj-home-mixer-strip">
                    <span>Mid</span>
                    <input
                      className="dj-home-mixer-slider"
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={equalizer.mid}
                      onChange={(event) => onEqualizerChange({ ...equalizer, mid: Number(event.target.value) })}
                      aria-label="Medios"
                    />
                    <strong>{equalizer.mid}</strong>
                  </label>
                  <label className="dj-home-mixer-strip">
                    <span>Treble</span>
                    <input
                      className="dj-home-mixer-slider"
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={equalizer.treble}
                      onChange={(event) => onEqualizerChange({ ...equalizer, treble: Number(event.target.value) })}
                      aria-label="Agudos"
                    />
                    <strong>{equalizer.treble}</strong>
                  </label>
                </div>

                <div className="dj-home-mixer-volume-panel">
                  <div className="dj-home-volume-head">
                    <span>Volumen</span>
                    <strong>{Math.round(volume * 100)}%</strong>
                  </div>
                  <input
                    className="dj-home-volume-slider"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(volume * 100)}
                    onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
                    aria-label="Volumen general"
                  />
                </div>
              </div>

              <div className="dj-home-mixer-lights" aria-hidden="true">
                {[...mixerLights].reverse().map((level, index) => (
                  <span
                    key={`right-${index}`}
                    className={`dj-home-led${level > 48 ? ' dj-home-led-active' : ''}${level > 76 ? ' dj-home-led-hot' : ''}`}
                    style={{ opacity: `${Math.max(0.22, level / 100)}` }}
                  />
                ))}
              </div>
            </div>

            <div className="dj-home-crossfader">
              <div className="dj-home-crossfader-head">
                <span>Deck A {Math.round(deckAWeight * 100)}%</span>
                <strong>Crossfader</strong>
                <span>Deck B {Math.round(deckBWeight * 100)}%</span>
              </div>
              <input
                className="dj-home-crossfader-slider"
                type="range"
                min={0}
                max={100}
                step={1}
                value={mixer.crossfader}
                onChange={(event) => onMixerChange({ ...mixer, crossfader: Number(event.target.value) })}
                aria-label="Crossfader"
              />
            </div>

            <div className="dj-home-filter-panel">
              <div className="dj-home-volume-head">
                <span>Filtro</span>
                <strong>{mixer.filter}</strong>
              </div>
              <input
                className="dj-home-volume-slider"
                type="range"
                min={0}
                max={100}
                step={1}
                value={mixer.filter}
                onChange={(event) => onMixerChange({ ...mixer, filter: Number(event.target.value) })}
                aria-label="Filtro"
              />
            </div>

            <div className="dj-home-mixer-tools">
              <button type="button" className="dj-home-square-button" onClick={onOpenLibrarySearch}>
                Search
              </button>
              <button
                type="button"
                className={`dj-home-square-button${samplerOpen ? ' dj-home-square-button-active' : ''}`}
                onClick={() => setSamplerOpen((current) => !current)}
              >
                Sampler
              </button>
              <button
                type="button"
                className={`dj-home-square-button${effectsOpen ? ' dj-home-square-button-active' : ''}`}
                onClick={() => setEffectsOpen((current) => !current)}
              >
                FX
              </button>
            </div>

            {samplerOpen ? (
              <div className="dj-home-effects-panel dj-home-effects-panel-secondary">
                <span>Sampler</span>
                <strong>Panel auxiliar listo para disparos rapidos.</strong>
              </div>
            ) : null}
            {effectsOpen ? (
              <div className="dj-home-effects-panel">
                <span>FX</span>
                <strong>Filtro listo para moldear el sonido del deck.</strong>
              </div>
            ) : null}
          </section>

          <section className="dj-home-deck dj-home-deck-b dj-home-deck-simple">
            <div className="dj-home-deck-header">
              <div>
                <p className="eyebrow">Deck B</p>
                <strong>A continuacion</strong>
              </div>
              <span className="dj-home-queue-count">{queueTracks.length} en cola</span>
            </div>

            <div className="dj-home-queue-panel dj-home-queue-panel-simple">
              {queueTracks.length > 0 ? (
                queueTracks.map((song, index) => (
                  <article key={song.id} className={`dj-home-queue-row${index === 0 ? ' dj-home-queue-row-next' : ''}`}>
                    <div className="dj-home-queue-index">{String(index + 1).padStart(2, '0')}</div>
                    <div className="dj-home-queue-cover" style={{ background: song.cover }} />
                    <div className="dj-home-queue-copy">
                      <strong>{song.title}</strong>
                      <p>{song.artist}</p>
                    </div>
                    <button
                      type="button"
                      className="dj-home-queue-button"
                      onClick={index === 0 ? onNext : undefined}
                      disabled={index !== 0}
                      aria-label={index === 0 ? `Ir a ${song.title}` : `${song.title} en cola`}
                    >
                      {'>'}
                    </button>
                  </article>
                ))
              ) : (
                <div className="dj-home-queue-empty">
                  <p className="eyebrow">Cola</p>
                  <strong>No hay mas canciones</strong>
                  <span>Elige otra playlist para seguir mezclando.</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
