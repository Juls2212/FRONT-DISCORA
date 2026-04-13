import { API_BASE_URL } from '../config/api';
import { Song } from '../types';

export function normalizeAudioUrl(audioUrl: string): string {
  if (/^https?:\/\//i.test(audioUrl)) {
    return audioUrl;
  }

  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const normalizedPath = audioUrl.startsWith('/') ? audioUrl : `/${audioUrl}`;
  return `${baseUrl}${normalizedPath}`;
}

export function formatDurationFromSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function needsDurationResolution(song: Song): boolean {
  return song.duration === '--:--' || song.duration === '0:00';
}

export function resolveSongDuration(song: Song): Promise<string> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = song.audioUrl;

    const cleanup = () => {
      audio.removeAttribute('src');
      audio.load();
    };

    audio.onloadedmetadata = () => {
      const nextDuration = formatDurationFromSeconds(audio.duration);
      cleanup();
      resolve(nextDuration);
    };

    audio.onerror = () => {
      cleanup();
      reject(new Error(`Unable to load metadata for ${song.audioUrl}`));
    };
  });
}
