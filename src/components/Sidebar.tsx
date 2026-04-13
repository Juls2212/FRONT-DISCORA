import { sidebarPlaylists } from '../data';

const navigationItems = ['Inicio', 'Biblioteca', 'Playlists'];

type SidebarProps = {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
};

export function Sidebar({ theme, onToggleTheme }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-block">
        <div className="brand-mark" aria-hidden="true">
          <div className="brand-ring brand-ring-outer" />
          <div className="brand-ring brand-ring-inner" />
        </div>
        <div className="brand">Discora</div>
        <p className="brand-copy">Escucha con profundidad.</p>
        <nav className="sidebar-nav" aria-label="Navegación principal">
          {navigationItems.map((item) => (
            <button key={item} className="nav-button" type="button">
              {item}
            </button>
          ))}
        </nav>
      </div>

      <section className="sidebar-collection" aria-label="Playlists de referencia">
        <button className="theme-toggle" type="button" onClick={onToggleTheme} aria-label="Cambiar tema">
          <span className="theme-toggle-icon" aria-hidden="true">
            {theme === 'dark' ? '☀' : '☾'}
          </span>
          <span>{theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}</span>
        </button>
        <p className="sidebar-label">Selecciones</p>
        {sidebarPlaylists.map((item) => (
          <button key={item} className="collection-button" type="button">
            {item}
          </button>
        ))}
      </section>
    </aside>
  );
}
