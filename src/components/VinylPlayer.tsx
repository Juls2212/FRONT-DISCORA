import { Song } from '../types';

type VinylPlayerProps = {
  song: Song;
  isPlaying: boolean;
};

export function VinylPlayer({ song, isPlaying }: VinylPlayerProps) {
  return (
    <section className="vinyl-panel" aria-label="Reproductor de vinilo">
      <div className="vinyl-cover" style={{ background: song.cover }}>
        <div className={`vinyl-record ${isPlaying ? 'vinyl-record-spinning' : ''}`}>
          <div className="vinyl-center" />
        </div>
      </div>
      <div className="vinyl-copy">
        <p className="eyebrow">En reproducción</p>
        <h2>{song.title}</h2>
        <p>
          {song.artist} · {song.album}
        </p>
      </div>
    </section>
  );
}
