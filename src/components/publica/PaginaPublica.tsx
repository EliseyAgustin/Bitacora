import type { CSSProperties, ReactNode } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import logoIcono from '@/assets/logo/laburin-logo-icono.svg';
import { CapituloAviso, CapituloEtapas, CapituloPuntaje } from './Capitulos';
import { Topo } from './Topo';
import './publica.css';

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
    texto: 'Laburin junta las ofertas, calcula cuánto encaja cada una con vos y te avisa cuándo retomar.',
  },
  registro: {
    titulo: 'Empezá a ordenar tu búsqueda',
    texto: 'Armás tu perfil en cinco pasos y Laburin te muestra qué ofertas te convienen más.',
  },
};

// Página de inicio, antes de entrar: la sesión arriba y, debajo, un capítulo de color por cada cosa que hace Laburin.
export function PaginaPublica({ modo, onCrearCuenta, children }: PaginaPublicaProps) {
  const { titulo, texto } = TITULARES[modo];

  return (
    <div className="pub">
      <main>
        <section className="pub-capitulo pub-f1" aria-labelledby="titulo-principal">
          <header className="pub-top">
            <span className="pub-marca">
              <img src={logoIcono} alt="" />
              Laburin
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
