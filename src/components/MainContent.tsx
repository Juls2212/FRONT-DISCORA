import { featuredMoment, playlists, recentSongs } from '../data';
import { FeaturedPanel } from './FeaturedPanel';
import { PlaylistCard } from './PlaylistCard';
import { RecentSongItem } from './RecentSongItem';
import { SectionContainer } from './SectionContainer';

export function MainContent() {
  return (
    <main className="main-content">
      <section className="hero-card">
        <div className="hero-atmosphere hero-atmosphere-left" />
        <div className="hero-atmosphere hero-atmosphere-right" />
        <div className="hero-copy-block">
          <p className="eyebrow">Inicio</p>
          <h1>Bienvenido a Discora</h1>
          <p className="hero-copy">
            Un espacio editorial para descubrir música entre sombras suaves, texturas profundas y
            detalles inspirados por la cultura del vinilo.
          </p>
        </div>
        <FeaturedPanel
          eyebrow={featuredMoment.eyebrow}
          title={featuredMoment.title}
          description={featuredMoment.description}
          note={featuredMoment.note}
          artwork={featuredMoment.artwork}
        />
      </section>

      <SectionContainer title="Playlists destacadas" subtitle="Selección para esta noche">
        <div className="playlist-grid">
          {playlists.map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} />
          ))}
        </div>
      </SectionContainer>

      <SectionContainer title="Escuchado recientemente" subtitle="Vuelve a entrar en ambiente">
        <div className="recent-songs-list">
          {recentSongs.map((song) => (
            <RecentSongItem key={song.id} song={song} />
          ))}
        </div>
      </SectionContainer>
    </main>
  );
}
