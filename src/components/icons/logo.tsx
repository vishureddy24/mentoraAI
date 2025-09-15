import type { FC } from 'react';

export const Logo: FC<React.SVGProps<SVGSVGElement>> = props => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <radialGradient id="glow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
        <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.8 }} />
        <stop offset="60%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.3 }} />
        <stop offset="100%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0 }} />
      </radialGradient>
      <radialGradient id="core" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
        <stop offset="0%" style={{ stopColor: 'hsl(var(--primary-foreground))', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: 'hsl(var(--primary-foreground))', stopOpacity: 0.8 }} />
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="50" fill="url(#glow)" />
    <circle cx="50" cy="50" r="20" fill="url(#core)" />
  </svg>
);
