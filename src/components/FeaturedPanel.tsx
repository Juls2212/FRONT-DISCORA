type FeaturedPanelProps = {
  eyebrow: string;
  title: string;
  description: string;
  note: string;
  artwork: string;
};

export function FeaturedPanel({ eyebrow, title, description, note, artwork }: FeaturedPanelProps) {
  return (
    <article className="featured-panel">
      <div className="featured-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="featured-description">{description}</p>
        <span className="featured-note">{note}</span>
      </div>
      <div className="featured-artwork" style={{ background: artwork }}>
        <div className="featured-ring featured-ring-large" />
        <div className="featured-ring featured-ring-small" />
      </div>
    </article>
  );
}
