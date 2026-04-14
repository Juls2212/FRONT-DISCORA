import { Playlist } from '../types';

type PlaylistCardProps = {
  isActive?: boolean;
  onClick?: () => void;
  playlist: Playlist;
};

export function PlaylistCard({ isActive = false, onClick, playlist }: PlaylistCardProps) {
  return (
    <article className={`playlist-card ${isActive ? 'playlist-card-active' : ''}`}>
      <div className="playlist-artwork" style={{ background: playlist.artwork }}>
        <div className="playlist-ring" />
      </div>
      <div className="playlist-card-copy">
        <span className="playlist-card-meta">Playlist viva</span>
        <h3>{playlist.name}</h3>
        <p>{playlist.detail}</p>
        <span>{playlist.songCount} canciones</span>
      </div>
      {onClick ? (
        <button className="playlist-card-button" type="button" onClick={onClick}>
          Ver playlist
        </button>
      ) : null}
    </article>
  );
}
