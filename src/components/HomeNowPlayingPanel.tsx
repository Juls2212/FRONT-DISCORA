import { useState } from 'react';
import { EqualizerState, PlaybackContext, Song } from '../types';
import { EmptyPlaybackState } from './EmptyPlaybackState';
import { EqualizerPanel } from './EqualizerPanel';
import { PlaybackControlPanel } from './PlaybackControlPanel';
import { VinylControlCenter } from './VinylControlCenter';

type HomeNowPlayingPanelProps = {
  canGoNext: boolean;
  canGoPrevious: boolean;
  currentTime: number;
  equalizer: EqualizerState;
  playbackContext: PlaybackContext | null;
  playbackDuration: number;
  isPlaying: boolean;
  libraryCount: number;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onTogglePlayback: () => void;
  onEqualizerChange: (equalizer: EqualizerState) => void;
  onVolumeChange: (volume: number) => void;
  playlistCount: number;
  selectedTrack: Song | null;
  volume: number;
};

export function HomeNowPlayingPanel({
  canGoNext,
  canGoPrevious,
  currentTime,
  equalizer,
  isPlaying,
  libraryCount,
  onNext,
  onEqualizerChange,
  onPrevious,
  onSeek,
  onTogglePlayback,
  onVolumeChange,
  playbackContext,
  playbackDuration,
  playlistCount,
  selectedTrack,
  volume,
}: HomeNowPlayingPanelProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (!selectedTrack) {
    return <EmptyPlaybackState libraryCount={libraryCount} playlistCount={playlistCount} />;
  }

  return (
    <main className="main-content home-view home-control-view">
      <section className="hero-card home-control-hero">
        <div className="hero-atmosphere hero-atmosphere-left" />
        <div className="hero-atmosphere hero-atmosphere-right" />
        <div className="home-control-layout">
          <div className="home-main-column">
            <VinylControlCenter isPlaying={isPlaying} song={selectedTrack} />
            <PlaybackControlPanel
              canGoNext={canGoNext}
              canGoPrevious={canGoPrevious}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onNext={onNext}
              onPrevious={onPrevious}
              onSeek={onSeek}
              onTogglePlayback={onTogglePlayback}
              playbackContext={playbackContext}
              playbackDuration={playbackDuration}
              song={selectedTrack}
            />
          </div>
          <EqualizerPanel
            isOpen={isSettingsOpen}
            value={equalizer}
            volume={volume}
            onChange={onEqualizerChange}
            onToggleOpen={() => setIsSettingsOpen((current) => !current)}
            onVolumeChange={onVolumeChange}
          />
        </div>
      </section>
    </main>
  );
}
