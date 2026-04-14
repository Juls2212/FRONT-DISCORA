import { EqualizerState, PlaybackContext, Song } from '../types';
import { HomeNowPlayingPanel } from './HomeNowPlayingPanel';

type MainContentProps = {
  canGoNext: boolean;
  canGoPrevious: boolean;
  currentTime: number;
  equalizer: EqualizerState;
  isPlaying: boolean;
  onNext: () => void;
  onPlayTrack: (song: Song, context: PlaybackContext, queue?: Song[]) => void;
  onEqualizerChange: (equalizer: EqualizerState) => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onTogglePlayback: () => void;
  onVolumeChange: (volume: number) => void;
  playbackContext: PlaybackContext | null;
  playbackDuration: number;
  playlistsCount: number;
  selectedTrack: Song | null;
  songs: Song[];
  volume: number;
};

export function MainContent({
  canGoNext,
  canGoPrevious,
  currentTime,
  equalizer,
  isPlaying,
  onNext,
  onEqualizerChange,
  onPrevious,
  onSeek,
  onTogglePlayback,
  onVolumeChange,
  playbackContext,
  playbackDuration,
  playlistsCount,
  selectedTrack,
  songs,
  volume,
}: MainContentProps) {
  return (
    <HomeNowPlayingPanel
      canGoNext={canGoNext}
      canGoPrevious={canGoPrevious}
      currentTime={currentTime}
      equalizer={equalizer}
      isPlaying={isPlaying}
      libraryCount={songs.length}
      onNext={onNext}
      onEqualizerChange={onEqualizerChange}
      onPrevious={onPrevious}
      onSeek={onSeek}
      onTogglePlayback={onTogglePlayback}
      onVolumeChange={onVolumeChange}
      playbackContext={playbackContext}
      playbackDuration={playbackDuration}
      playlistCount={playlistsCount}
      selectedTrack={selectedTrack}
      volume={volume}
    />
  );
}
