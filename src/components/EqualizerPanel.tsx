import { EqualizerState, MixerState } from '../types';
import { RotaryKnob } from './RotaryKnob';

type EqualizerPanelProps = {
  mixer: MixerState;
  value: EqualizerState;
  volume: number;
  onChange: (nextValue: EqualizerState) => void;
  onMixerChange: (nextValue: MixerState) => void;
  onVolumeChange: (volume: number) => void;
};

type BandKey = keyof EqualizerState;

const bandLabels: Record<BandKey, string> = {
  bass: 'Bass',
  mid: 'Mid',
  treble: 'Treble',
};

export function EqualizerPanel({ mixer, value, volume, onChange, onMixerChange, onVolumeChange }: EqualizerPanelProps) {
  const bands = Object.keys(bandLabels) as BandKey[];
  const deckAWeight = Math.max(0, 1 - mixer.crossfader / 100);
  const deckBWeight = Math.max(0, mixer.crossfader / 100);

  return (
    <aside className="home-settings-dock">
      <section className="home-eq-panel home-mixer-panel" aria-label="Cabina de mezcla">
        <div className="home-panel-header home-panel-header-mixer">
          <div>
            <p className="eyebrow">Mixer</p>
            <h2>Cabina</h2>
          </div>
          <span>EQ</span>
        </div>

        <div className="home-mixer-columns">
          <label className="home-mixer-channel home-mixer-channel-master">
            <span>Master</span>
            <input
              className="home-mixer-slider"
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(volume * 100)}
              onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
              aria-label="Volumen"
            />
            <strong>{Math.round(volume * 100)}</strong>
          </label>

          {bands.map((band) => (
            <label key={band} className="home-mixer-channel">
              <span>{bandLabels[band]}</span>
              <input
                className="home-mixer-slider"
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

          <div className="home-mixer-channel home-mixer-channel-filter">
            <span>Filtro</span>
            <RotaryKnob
              ariaLabel="Filtro"
              label="Filtro"
              value={mixer.filter}
              onChange={(filter) =>
                onMixerChange({
                  ...mixer,
                  filter,
                })
              }
            />
            <strong>{mixer.filter}</strong>
          </div>
        </div>

        <div className="home-mixer-knobs">
          <RotaryKnob
            ariaLabel="Ganancia"
            label="Gain"
            value={mixer.gain}
            onChange={(gain) =>
              onMixerChange({
                ...mixer,
                gain,
              })
            }
          />
        </div>

        <div className="home-crossfader-panel">
          <div className="home-crossfader-header">
            <span>A</span>
            <strong>Crossfader</strong>
            <span>B</span>
          </div>
          <input
            className="home-crossfader-slider"
            type="range"
            min={0}
            max={100}
            step={1}
            value={mixer.crossfader}
            onChange={(event) =>
              onMixerChange({
                ...mixer,
                crossfader: Number(event.target.value),
              })
            }
            aria-label="Crossfader"
          />
          <div className="home-crossfader-meta">
            <span>Deck A {Math.round(deckAWeight * 100)}%</span>
            <span>Deck B {Math.round(deckBWeight * 100)}%</span>
          </div>
        </div>
      </section>
    </aside>
  );
}
