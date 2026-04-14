import { EqualizerState } from '../types';

type EqualizerPanelProps = {
  value: EqualizerState;
  volume: number;
  onChange: (nextValue: EqualizerState) => void;
  onVolumeChange: (volume: number) => void;
};

type BandKey = keyof EqualizerState;

const bandLabels: Record<BandKey, string> = {
  bass: 'Bass',
  mid: 'Mid',
  treble: 'Treble',
};

export function EqualizerPanel({
  value,
  volume,
  onChange,
  onVolumeChange,
}: EqualizerPanelProps) {
  const bands = Object.keys(bandLabels) as BandKey[];

  return (
    <section className="home-control-panel home-eq-panel">
      <div className="home-panel-header">
        <div>
          <p className="eyebrow">Control</p>
          <h2>Cabina de mezcla</h2>
        </div>
        <span>Preparada para ajustes finos</span>
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
  );
}
