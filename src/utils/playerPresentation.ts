export function formatPlaybackTime(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function getArtworkBackground(cover: string | undefined): string {
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
