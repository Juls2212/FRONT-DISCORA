import type { ReactNode } from 'react';

type SectionContainerProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function SectionContainer({ title, subtitle, children }: SectionContainerProps) {
  return (
    <section className="content-section">
      <div className="section-header">
        <div>
          <p className="section-label">Curaduría Discora</p>
          <h2>{title}</h2>
        </div>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
      {children}
    </section>
  );
}
