import { EqualizerState } from '../types';

type EqualizerPanelProps = {
  isOpen: boolean;
  value: EqualizerState;
  volume: number;
  onChange: (nextValue: EqualizerState) => void;
  onToggleOpen: () => void;
  onVolumeChange: (volume: number) => void;
};

type BandKey = keyof EqualizerState;

const bandLabels: Record<BandKey, string> = {
  bass: 'Bass',
  mid: 'Mid',
  treble: 'Treble',
};

export function EqualizerPanel({
  isOpen,
  value,
  volume,
  onChange,
  onToggleOpen,
  onVolumeChange,
}: EqualizerPanelProps) {
  const bands = Object.keys(bandLabels) as BandKey[];

  return (
    <aside className="home-settings-dock">
      <button
        className={`home-settings-trigger${isOpen ? ' home-settings-trigger-active' : ''}`}
        type="button"
        onClick={onToggleOpen}
        aria-expanded={isOpen}
        aria-controls="home-settings-panel"
      >
        <span aria-hidden="true">🎛️</span>
        <span>Ajustes</span>
      </button>

      {isOpen ? (
        <section className="home-control-panel home-eq-panel" id="home-settings-panel">
          <div className="home-panel-header">
            <div>
              <p className="eyebrow">Control</p>
              <h2>Cabina de mezcla</h2>
            </div>
            <span>Sonido fino</span>
          </div>

          <div className="home-volume-block">
            <div className="home-slider-copy">
              <strong>Volumen</strong>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(volume * 100)}
              onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
              aria-label="Volumen"
            />
          </div>

          <div className="home-eq-bands">
            {bands.map((band) => (
              <label key={band} className="home-eq-band">
                <span>{bandLabels[band]}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={value[band]}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      [band]: Number(event.target.value),
                    })
                  }
                  aria-label={bandLabels[band]}
                />
                <strong>{value[band]}</strong>
              </label>
            ))}
          </div>
        </section>
      ) : null}
    </aside>
  );
}
