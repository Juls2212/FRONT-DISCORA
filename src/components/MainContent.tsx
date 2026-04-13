import { playlists, songs } from '../data';
import { Song } from '../types';

type MainContentProps = {
  currentSong: Song | null;
  onPlaySong: (song: Song) => void;
};

export function MainContent({ currentSong, onPlaySong }: MainContentProps) {
  return (
    <main className="main-content">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Tu espacio musical</p>
          <h1>Encuentra tu próximo momento favorito</h1>
          <p className="hero-copy">
            Playlists cuidadas, canciones listas para reproducir y una interfaz limpia para moverte
            rápido.
          </p>
        </div>
        <button className="hero-button" type="button" onClick={() => onPlaySong(songs[0])}>
          Reproducir ahora
        </button>
      </section>

      <section className="content-section">
        <div className="section-header">
          <h2>Playlists destacadas</h2>
          <span>Actualizado hoy</span>
        </div>
        <div className="playlist-grid">
          {playlists.map((playlist) => (
            <article key={playlist.id} className="playlist-card">
              <div className="playlist-cover" style={{ background: playlist.accent }} />
              <h3>{playlist.name}</h3>
              <p>{playlist.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section">
        <div className="section-header">
          <h2>Sonando cerca de ti</h2>
          <span>{songs.length} canciones</span>
        </div>
        <div className="song-list" role="list">
          {songs.map((song) => {
            const isActive = currentSong?.id === song.id;

            return (
              <article key={song.id} className={`song-row ${isActive ? 'song-row-active' : ''}`}>
                <div className="song-meta">
                  <div className="song-cover" style={{ background: song.cover }} />
                  <div>
                    <h3>{song.title}</h3>
                    <p>
                      {song.artist} · {song.album}
                    </p>
                  </div>
                </div>
                <div className="song-actions">
                  <span>{song.duration}</span>
                  <button type="button" onClick={() => onPlaySong(song)}>
                    {isActive ? 'Sonando' : 'Reproducir'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
