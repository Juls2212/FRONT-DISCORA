import { PointerEvent as ReactPointerEvent, useMemo, useState } from 'react';

type RotaryKnobProps = {
  ariaLabel: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
};

const MIN_ANGLE = -135;
const MAX_ANGLE = 135;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function RotaryKnob({ ariaLabel, label, value, onChange }: RotaryKnobProps) {
  const [isActive, setIsActive] = useState(false);
  const rotation = useMemo(() => MIN_ANGLE + (clamp(value, 0, 100) / 100) * (MAX_ANGLE - MIN_ANGLE), [value]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const startY = event.clientY;
    const startValue = value;
    setIsActive(true);
    event.currentTarget.setPointerCapture(event.pointerId);

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const delta = startY - moveEvent.clientY;
      onChange(clamp(startValue + delta, 0, 100));
    };

    const handlePointerUp = () => {
      setIsActive(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  return (
    <div className={`home-rotary-control${isActive ? ' home-rotary-control-active' : ''}`}>
      <span>{label}</span>
      <button className="home-rotary-knob" type="button" onPointerDown={handlePointerDown} aria-label={ariaLabel}>
        <span className="home-rotary-knob-face" style={{ transform: `rotate(${rotation}deg)` }}>
          <span className="home-rotary-knob-indicator" />
        </span>
      </button>
      <strong>{Math.round(value)}</strong>
    </div>
  );
}
