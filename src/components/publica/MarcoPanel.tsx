import type { ReactNode } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import logoIcono from '@/assets/logo/laburin-logo-icono.svg';
import { Topo } from './Topo';
import './publica.css';

interface MarcoPanelProps {
  // Qué campo de color ocupa la pantalla (1 azul, 2 naranja), los mismos del Login.
  campo?: 1 | 2;
  // Frase grande de la izquierda y lo que va debajo de ella (por ejemplo, los pasos).
  frase: string;
  lado?: ReactNode;
  // El formulario o el mensaje, directo sobre el campo de color.
  children: ReactNode;
}

// Mismo esqueleto que el Login y el Registro: la marca arriba, la frase grande a la izquierda, el formulario sin tarjeta sobre el
// campo de color a la derecha y la mascota grande abajo. Lo usan recuperar contraseña, nueva contraseña y «no encontrada».
export function MarcoPanel({ campo = 1, frase, lado, children }: MarcoPanelProps) {
  return (
    <div className={`pub pub-capitulo pub-f${campo} pub-marco-panel`} data-campo={campo}>
      <header className="pub-top">
        <span className="pub-marca">
          <img src={logoIcono} alt="" />
          Laburin
        </span>
        <ThemeToggle />
      </header>

      <div className="pub-grid">
        <div className="pub-copy">
          <p className="pub-frase">{frase}</p>
          {lado}
        </div>
        <main className="pub-panel">{children}</main>
      </div>

      <Topo className="pub-topo" />
    </div>
  );
}
