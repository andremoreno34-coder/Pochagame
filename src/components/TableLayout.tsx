import type { ReactNode } from 'react';

interface TableLayoutProps {
  children: ReactNode;
  className?: string;
}

export function TableLayout({ children, className = '' }: TableLayoutProps) {
  return (
    <div
      className={`table-bg ${className}`}
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      {children}
    </div>
  );
}
