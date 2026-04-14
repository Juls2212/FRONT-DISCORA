import { Song } from '../types';
import { getArtworkBackground } from '../utils/playerPresentation';

type VinylControlCenterProps = {
  isPlaying: boolean;
  song: Song;
};

export function VinylControlCenter({ isPlaying, song }: VinylControlCenterProps) {
  return (
    <section className="home-vinyl-stage" aria-label="Visual principal de reproduccion">
      <div className="home-vinyl-atmosphere">
        <div className="home-vinyl-aura home-vinyl-aura-primary" />
        <div className="home-vinyl-aura home-vinyl-aura-secondary" />
      </div>
      <div className={`home-vinyl-disc${isPlaying ? ' home-vinyl-disc-spinning' : ''}`}>
        <div className="home-vinyl-sheen" />
        <div className="home-vinyl-groove home-vinyl-groove-one" />
        <div className="home-vinyl-groove home-vinyl-groove-two" />
        <div className="home-vinyl-groove home-vinyl-groove-three" />
        <div className="home-vinyl-label" style={{ background: getArtworkBackground(song.cover) }}>
          <div className="home-vinyl-core" />
        </div>
      </div>
    </section>
  );
}
