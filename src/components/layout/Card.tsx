import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  glow?: boolean;
  float?: boolean;
}

export function Card({ title, subtitle, children, className = '', glow = false, float = false }: CardProps) {
  return (
    <div className={`glass-card rounded-2xl p-5 animate-fade-in ${glow ? 'gold-glow' : ''} ${float ? 'animate-float' : ''} ${className}`}>
      {title && (
        <div className="mb-4">
          <h3 className="text-[13px] font-semibold text-gold-light tracking-wide">{title}</h3>
          {subtitle && <p className="text-[11px] text-text-muted mt-0.5 font-light">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
