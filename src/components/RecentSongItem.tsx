import { Song } from '../types';

type RecentSongItemProps = {
  song: Song;
};

export function RecentSongItem({ song }: RecentSongItemProps) {
  return (
    <article className="recent-song-item">
      <div className="recent-song-meta">
        <div className="recent-song-cover" style={{ background: song.cover }} />
        <div>
          <h3>{song.title}</h3>
          <p>{song.artist}</p>
        </div>
      </div>
      <span>{song.duration}</span>
    </article>
  );
}
