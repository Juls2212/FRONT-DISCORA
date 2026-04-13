import { Playlist } from '../types';

type PlaylistCardProps = {
  playlist: Playlist;
};

export function PlaylistCard({ playlist }: PlaylistCardProps) {
  return (
    <article className="playlist-card">
      <div className="playlist-artwork" style={{ background: playlist.artwork }}>
        <div className="playlist-ring" />
      </div>
      <div className="playlist-card-copy">
        <h3>{playlist.name}</h3>
        <p>{playlist.detail}</p>
        <span>{playlist.songCount} canciones</span>
      </div>
    </article>
  );
}
