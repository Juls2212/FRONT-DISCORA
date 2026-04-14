import { useEffect, useMemo, useState } from 'react';
import { FavoriteButton } from './FavoriteButton';
import { PlaybackContext, Song } from '../types';
import { formatPlaybackTime, getArtworkBackground } from '../utils/playerPresentation';

type FullPlayerProps = {
  currentTime: number;
  isOpen: boolean;
  isPlaying: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onToggleFavorite: () => void;
  onTogglePlayback: () => void;
  playbackContext: PlaybackContext | null;
  playbackDuration: number;
  selectedTrack: Song | null;
  canGoNext: boolean;
  canGoPrevious: boolean;
};

type AmbientPalette = {
  accent: string;
  glow: string;
  shadow: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): { b: number; g: number; r: number } | null {
  const normalized = hex.replace('#', '').trim();

  if (![3, 6].includes(normalized.length)) {
    return null;
  }

  const fullHex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((character) => `${character}${character}`)
          .join('')
      : normalized;

  const value = Number.parseInt(fullHex, 16);

  if (Number.isNaN(value)) {
    return null;
  }

  return {
    b: value & 255,
    g: (value >> 8) & 255,
    r: (value >> 16) & 255,
  };
}

function rgbStringToRgb(color: string): { b: number; g: number; r: number } | null {
  const match = color.match(/rgba?\(([^)]+)\)/i);

  if (!match) {
    return null;
  }

  const [r = 0, g = 0, b = 0] = match[1]
    .split(',')
    .slice(0, 3)
    .map((part) => Number.parseFloat(part.trim()));

  return {
    b: clamp(Math.round(b), 0, 255),
    g: clamp(Math.round(g), 0, 255),
    r: clamp(Math.round(r), 0, 255),
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; l: number; s: number } {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case red:
        h = (green - blue) / delta + (green < blue ? 6 : 0);
        break;
      case green:
        h = (blue - red) / delta + 2;
        break;
      default:
        h = (red - green) / delta + 4;
        break;
    }

    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    l: Math.round(l * 100),
    s: Math.round(s * 100),
  };
}

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function createFallbackPalette(seed: string): AmbientPalette {
  const hash = hashString(seed || 'discora');
  const hue = hash % 360;

  return {
    accent: `hsla(${hue} 42% 56% / 0.32)`,
    glow: `hsla(${(hue + 26) % 360} 34% 50% / 0.24)`,
    shadow: `hsla(${(hue + 320) % 360} 28% 18% / 0.48)`,
  };
}

function extractGradientPalette(cover: string): AmbientPalette | null {
  const hexMatches = cover.match(/#([0-9a-f]{3}|[0-9a-f]{6})\b/gi) ?? [];
  const rgbMatches = cover.match(/rgba?\([^)]+\)/gi) ?? [];
  const colors = [...hexMatches, ...rgbMatches]
    .map((value) => hexToRgb(value) ?? rgbStringToRgb(value))
    .filter((value): value is { b: number; g: number; r: number } => Boolean(value));

  if (!colors.length) {
    return null;
  }

  const average = colors.reduce(
    (accumulator, color) => ({
      b: accumulator.b + color.b,
      g: accumulator.g + color.g,
      r: accumulator.r + color.r,
    }),
    { b: 0, g: 0, r: 0 },
  );

  const sample = {
    b: Math.round(average.b / colors.length),
    g: Math.round(average.g / colors.length),
    r: Math.round(average.r / colors.length),
  };

  const hsl = rgbToHsl(sample.r, sample.g, sample.b);

  return {
    accent: `hsla(${hsl.h} ${clamp(hsl.s, 24, 52)}% ${clamp(hsl.l + 6, 42, 62)}% / 0.34)`,
    glow: `hsla(${(hsl.h + 18) % 360} ${clamp(hsl.s - 10, 18, 44)}% ${clamp(hsl.l + 2, 36, 56)}% / 0.22)`,
    shadow: `hsla(${(hsl.h + 330) % 360} ${clamp(hsl.s - 16, 16, 34)}% ${clamp(hsl.l - 30, 12, 24)}% / 0.5)`,
  };
}

async function extractImagePalette(source: string): Promise<AmbientPalette> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
          resolve(createFallbackPalette(source));
          return;
        }

        canvas.width = 24;
        canvas.height = 24;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);

        let totalR = 0;
        let totalG = 0;
        let totalB = 0;
        let samples = 0;

        for (let index = 0; index < data.length; index += 16) {
          totalR += data[index];
          totalG += data[index + 1];
          totalB += data[index + 2];
          samples += 1;
        }

        if (!samples) {
          resolve(createFallbackPalette(source));
          return;
        }

        const hsl = rgbToHsl(
          Math.round(totalR / samples),
          Math.round(totalG / samples),
          Math.round(totalB / samples),
        );

        resolve({
          accent: `hsla(${hsl.h} ${clamp(hsl.s, 22, 54)}% ${clamp(hsl.l + 4, 40, 60)}% / 0.32)`,
          glow: `hsla(${(hsl.h + 20) % 360} ${clamp(hsl.s - 12, 18, 42)}% ${clamp(hsl.l + 1, 34, 52)}% / 0.2)`,
          shadow: `hsla(${(hsl.h + 318) % 360} ${clamp(hsl.s - 16, 16, 34)}% ${clamp(hsl.l - 30, 12, 24)}% / 0.48)`,
        });
      } catch {
        resolve(createFallbackPalette(source));
      }
    };

    image.onerror = () => {
      resolve(createFallbackPalette(source));
    };

    image.src = source;
  });
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
  onToggleFavorite,
  onTogglePlayback,
  playbackContext,
  playbackDuration,
  selectedTrack,
}: FullPlayerProps) {
  const [ambientPalette, setAmbientPalette] = useState<AmbientPalette>(() => createFallbackPalette('discora-player'));
  const progressMax = playbackDuration > 0 ? playbackDuration : 0;
  const progressValue = progressMax > 0 ? Math.min(currentTime, progressMax) : 0;
  const artworkBackground = getArtworkBackground(selectedTrack?.cover);
  const contextCopy =
    playbackContext?.type === 'playlist'
      ? `Escuchando desde ${playbackContext.playlistName}`
      : 'Escuchando desde tu biblioteca';

  useEffect(() => {
    const cover = selectedTrack?.cover?.trim();

    if (!cover) {
      setAmbientPalette(createFallbackPalette('discora-player'));
      return;
    }

    if (
      cover.startsWith('linear-gradient') ||
      cover.startsWith('radial-gradient') ||
      cover.startsWith('conic-gradient')
    ) {
      setAmbientPalette(extractGradientPalette(cover) ?? createFallbackPalette(cover));
      return;
    }

    let active = true;

    void extractImagePalette(cover).then((palette) => {
      if (active) {
        setAmbientPalette(palette);
      }
    });

    return () => {
      active = false;
    };
  }, [selectedTrack?.cover]);

  const ambientStyle = useMemo(
    () =>
      ({
        '--player-ambient-accent': ambientPalette.accent,
        '--player-ambient-glow': ambientPalette.glow,
        '--player-ambient-shadow': ambientPalette.shadow,
      }) as React.CSSProperties,
    [ambientPalette],
  );

  return (
    <div className={`full-player${isOpen ? ' full-player-open' : ''}`} aria-hidden={!isOpen}>
      <div className="full-player-backdrop" onClick={onClose} />
      <section className="full-player-panel" style={ambientStyle}>
        <div className="full-player-atmosphere">
          <div className="full-player-aura full-player-aura-primary" />
          <div className="full-player-aura full-player-aura-secondary" />
          <div className="full-player-aura full-player-aura-shadow" />
        </div>
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
            {selectedTrack ? (
              <div className="full-player-favorite-row">
                <FavoriteButton isActive={Boolean(selectedTrack.isFavorite)} onClick={onToggleFavorite} />
              </div>
            ) : null}
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
              <button
                className="full-player-icon-button"
                type="button"
                onClick={onPrevious}
                disabled={!canGoPrevious}
                aria-label="Anterior"
                title="Anterior"
              >
                <span aria-hidden="true">{'<<'}</span>
              </button>
              <button
                className="full-player-primary full-player-primary-icon"
                type="button"
                onClick={onTogglePlayback}
                disabled={!selectedTrack}
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                title={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                <span aria-hidden="true">{isPlaying ? '||' : '>'}</span>
              </button>
              <button
                className="full-player-icon-button"
                type="button"
                onClick={onNext}
                disabled={!canGoNext}
                aria-label="Siguiente"
                title="Siguiente"
              >
                <span aria-hidden="true">{'>>'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
