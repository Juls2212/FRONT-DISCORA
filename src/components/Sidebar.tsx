import { useState } from 'react';
import { Playlist } from '../types';

type ViewName = 'home' | 'library' | 'playlists';

const navigationItems = ['Inicio', 'Biblioteca', 'Playlists'];

type SidebarProps = {
  activeView: ViewName;
  playlists: Playlist[];
  playlistsError: string | null;
  playlistsLoading: boolean;
  theme: 'dark' | 'light';
  onSelectView: (view: ViewName) => void;
  onToggleTheme: () => void;
};

export function Sidebar({
  activeView,
  playlists,
  playlistsError,
  playlistsLoading,
  theme,
  onSelectView,
  onToggleTheme,
}: SidebarProps) {
  const [isManualOpen, setIsManualOpen] = useState(false);

  return (
    <aside className="sidebar">
      <div className="sidebar-block">
        <div className="brand-mark" aria-hidden="true">
          <div className="brand-ring brand-ring-outer" />
          <div className="brand-ring brand-ring-inner" />
        </div>
        <div className="brand">Discora</div>
        <p className="brand-copy">Escucha con profundidad.</p>
        <nav className="sidebar-nav" aria-label="Navegacion principal">
          {navigationItems.map((item) => (
            <button
              key={item}
              className={`nav-button ${activeView === item.toLowerCase().replace('biblioteca', 'library').replace('inicio', 'home') ? 'nav-button-active' : ''}`}
              type="button"
              onClick={() =>
                onSelectView(
                  item === 'Inicio' ? 'home' : item === 'Biblioteca' ? 'library' : 'playlists',
                )
              }
            >
              {item}
            </button>
          ))}
        </nav>
        <section className="sidebar-manual" aria-label="Manual de la cabina">
          <button
            className={`sidebar-manual-toggle${isManualOpen ? ' sidebar-manual-toggle-open' : ''}`}
            type="button"
            onClick={() => setIsManualOpen((current) => !current)}
            aria-expanded={isManualOpen}
          >
            <div>
              <strong>Guia</strong>
              <span>Manual de la cabina</span>
            </div>
            <span aria-hidden="true">{isManualOpen ? '-' : '+'}</span>
          </button>
        </section>
      </div>

      {isManualOpen ? (
        <div className="sidebar-manual-modal" role="dialog" aria-modal="true" aria-label="Manual de la cabina">
          <button className="sidebar-manual-backdrop" type="button" onClick={() => setIsManualOpen(false)} aria-label="Cerrar manual" />
          <div className="sidebar-manual-sheet">
            <div className="sidebar-manual-sheet-header">
              <div>
                <strong>Manual de la cabina</strong>
                <span>Guia rapida de controles DJ</span>
              </div>
              <button className="sidebar-manual-close" type="button" onClick={() => setIsManualOpen(false)} aria-label="Cerrar">
                x
              </button>
            </div>
            <div className="sidebar-manual-panel">
              <p className="sidebar-manual-intro">
                Esta interfaz simula una cabina DJ donde puedes controlar la reproduccion y el sonido en tiempo real.
              </p>

              <div className="sidebar-manual-section">
                <h3>Deck A</h3>
                <p>LOAD: carga la cancion al deck</p>
                <p>CUE: vuelve al inicio o punto marcado</p>
                <p>LOOP: repite parte de la cancion</p>
                <p>VINYL: modo visual/interaccion tipo vinilo</p>
                <p>SLIP: modo de reproduccion especial</p>
              </div>

              <div className="sidebar-manual-section">
                <h3>Mixer</h3>
                <p>MASTER: volumen general</p>
                <p>BASS: graves</p>
                <p>MID: medios</p>
                <p>TREBLE: agudos</p>
                <p>FILTER: modifica el tono del sonido</p>
                <p>GAIN: intensidad del canal</p>
                <p>CROSSFADER: mezcla entre Deck A y Deck B</p>
              </div>

              <div className="sidebar-manual-section">
                <h3>Deck B</h3>
                <p>Lista de reproduccion siguiente</p>
                <p>Permite cargar o saltar canciones</p>
              </div>

              <div className="sidebar-manual-section">
                <h3>Pads</h3>
                <p>IN / OUT / EXIT: control de loops</p>
                <p>SYNC: reinicia valores o sincroniza</p>
                <p>Otros: accesos rapidos</p>
              </div>

              <div className="sidebar-manual-section">
                <h3>Herramientas</h3>
                <p>SEARCH: buscar canciones</p>
                <p>SAMPLER: sonidos adicionales</p>
                <p>FX: efectos</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <section className="sidebar-collection" aria-label="Playlists de referencia">
        <button className="theme-toggle" type="button" onClick={onToggleTheme} aria-label="Cambiar tema">
          <span className="theme-toggle-icon" aria-hidden="true">
            {theme === 'dark' ? 'Sun' : 'Moon'}
          </span>
          <span>{theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}</span>
        </button>
        <p className="sidebar-label">Selecciones</p>
        {playlistsLoading ? <p className="sidebar-feedback">Cargando playlists...</p> : null}
        {!playlistsLoading && playlistsError ? <p className="sidebar-feedback">{playlistsError}</p> : null}
        {!playlistsLoading && !playlistsError && playlists.length === 0 ? (
          <p className="sidebar-feedback">No hay playlists disponibles.</p>
        ) : null}
        {!playlistsLoading && !playlistsError
          ? playlists.slice(0, 4).map((playlist) => (
              <button key={playlist.id} className="collection-button" type="button">
                {playlist.name}
              </button>
            ))
          : null}
      </section>
    </aside>
  );
}
