import { EqualizerState, MixerState, PlaybackContext, Song } from '../types';
import { HomeNowPlayingPanel } from './HomeNowPlayingPanel';

type MainContentProps = {
  canGoNext: boolean;
  canGoPrevious: boolean;
  currentTime: number;
  equalizer: EqualizerState;
  isPlaying: boolean;
  mixer: MixerState;
  onNext: () => void;
  onPlayTrack: (song: Song, context: PlaybackContext, queue?: Song[]) => void;
  onEqualizerChange: (equalizer: EqualizerState) => void;
  onMixerChange: (mixer: MixerState) => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onTogglePlayback: () => void;
  onVolumeChange: (volume: number) => void;
  playbackContext: PlaybackContext | null;
  playbackDuration: number;
  playbackQueue: Song[];
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
      mixer={mixer}
      onNext={onNext}
      onEqualizerChange={onEqualizerChange}
      onMixerChange={onMixerChange}
      onPrevious={onPrevious}
      onSeek={onSeek}
      onTogglePlayback={onTogglePlayback}
      onVolumeChange={onVolumeChange}
      playbackContext={playbackContext}
      playbackDuration={playbackDuration}
      playbackQueue={playbackQueue}
      playlistCount={playlistsCount}
      selectedTrack={selectedTrack}
      volume={volume}
    />
  );
}
