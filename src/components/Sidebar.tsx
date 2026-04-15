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
      </div>

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
