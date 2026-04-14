import { Song } from '../types';
import { getCoverSurfaceStyle } from '../utils/songPresentation';

type RecentSongItemProps = {
  onClick: () => void;
  song: Song;
};

export function RecentSongItem({ onClick, song }: RecentSongItemProps) {
  return (
    <button className="recent-song-item" type="button" onClick={onClick}>
      <div className="recent-song-meta">
        <div className="recent-song-cover" style={getCoverSurfaceStyle(song.cover)} />
        <div>
          <h3>{song.title}</h3>
          <p>{song.artist}</p>
        </div>
      </div>
      <span>{song.duration}</span>
    </button>
  );
}
