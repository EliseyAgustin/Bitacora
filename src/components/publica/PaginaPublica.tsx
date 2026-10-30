import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { desplazarA } from '@/lib/desplazar';
import { ThemeToggle } from '@/components/ThemeToggle';
import logoIcono from '@/assets/logo/logo-icono.svg';
import { CapituloAviso, CapituloEtapas, CapituloPuntaje } from './Capitulos';
import { Topo } from './Topo';
import './publica.css';
import { MARCA } from '@/lib/marca';

export type ModoPublico = 'login' | 'registro';

interface PaginaPublicaProps {
  modo: ModoPublico;
  onCrearCuenta: () => void;
  // El formulario (iniciar sesión o registrarse), que vive en el primer capítulo.
  children: ReactNode;
}

const TITULARES: Record<ModoPublico, { titulo: string; texto: string }> = {
  login: {
    titulo: 'Tu búsqueda de empleo, ordenada',
    texto: MARCA.descripcion,
  },
  registro: {
    titulo: 'Empezá a ordenar tu búsqueda',
    texto: 'Armás tu perfil en cinco pasos y empezás a registrar tu búsqueda.',
  },
};

// Página de inicio, antes de entrar: la sesión arriba y, debajo, un capítulo de color por cada cosa que hace la aplicación.
export function PaginaPublica({ modo, onCrearCuenta, children }: PaginaPublicaProps) {
  const { titulo, texto } = TITULARES[modo];

  // Los enlaces internos (Cómo funciona, Tu puntaje) bajan despacio en vez de saltar.
  function alHacerClic(e: MouseEvent<HTMLDivElement>) {
    const enlace = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    const destino = enlace && document.getElementById(enlace.getAttribute('href')!.slice(1));
    if (!destino) return;
    e.preventDefault();
    if (!destino.hasAttribute('tabindex')) destino.setAttribute('tabindex', '-1');
    desplazarA(destino);
    history.replaceState(null, '', `#${destino.id}`);
  }

  return (
    <div className="pub" onClick={alHacerClic}>
      <main>
        <section className="pub-capitulo pub-f1" aria-labelledby="titulo-principal">
          <header className="pub-top">
            <span className="pub-marca">
              <img src={logoIcono} alt="" />
              {MARCA.nombre}
            </span>
            <nav className="pub-nav" aria-label="Principal">
              <a href="#como-funciona">Cómo funciona</a>
              <a href="#puntaje">Tu puntaje</a>
              <ThemeToggle />
            </nav>
          </header>

          <div className="pub-grid">
            <div className="pub-copy">
              <h1 id="titulo-principal" className="pub-sube" style={{ '--i': 0 } as CSSProperties}>
                {titulo}
              </h1>
              <p className="pub-sube" style={{ '--i': 1 } as CSSProperties}>
                {texto}
              </p>
            </div>
            <div className="pub-panel pub-sube" style={{ '--i': 2 } as CSSProperties}>
              {children}
            </div>
          </div>

          <Topo className="pub-topo" />
        </section>

        <CapituloPuntaje />
        <CapituloEtapas />
        <CapituloAviso
          onCrearCuenta={() => {
            onCrearCuenta();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </main>
    </div>
  );
}
