import type { ReactNode } from 'react';

interface EncabezadoAuthProps {
  titulo: string;
  children?: ReactNode;
}

// Título y bajada del formulario, con el mismo estilo que «Ingresá a tu cuenta» del Login.
export function EncabezadoAuth({ titulo, children }: EncabezadoAuthProps) {
  return (
    <>
      <h1>{titulo}</h1>
      {children && <div className="pub-lead pub-lead-multi">{children}</div>}
    </>
  );
}
