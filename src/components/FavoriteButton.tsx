type FavoriteButtonProps = {
  isActive: boolean;
  onClick: () => void;
};

export function FavoriteButton({ isActive, onClick }: FavoriteButtonProps) {
  return (
    <button
      className={`favorite-button${isActive ? ' favorite-button-active' : ''}`}
      type="button"
      onClick={onClick}
      aria-label={isActive ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      title={isActive ? 'Quitar de favoritos' : 'Agregar a favoritos'}
    >
      <span aria-hidden="true">{isActive ? '\u2665' : '\u2661'}</span>
    </button>
  );
}
