import type { ReactNode } from 'react';

type SectionContainerProps = {
  title: string;
  subtitle?: string;
  label?: string;
  className?: string;
  children: ReactNode;
};

export function SectionContainer({
  title,
  subtitle,
  label = 'Curaduria Discora',
  className = '',
  children,
}: SectionContainerProps) {
  return (
    <section className={`content-section ${className}`.trim()}>
      <div className="section-header">
        <div>
          <p className="section-label">{label}</p>
          <h2>{title}</h2>
        </div>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
      {children}
    </section>
  );
}
