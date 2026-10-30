import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { EncabezadoAuth } from '@/components/auth/EncabezadoAuth';
import { useAuth } from '@/hooks/useAuth';
import { useRol } from '@/hooks/useRol';
import { rutaInicialPorRol } from '@/lib/rol';

// Se muestra cuando la dirección no existe (un enlace viejo, un error de tipeo). Lleva al inicio que corresponda:
// a la pantalla de ingreso si no hay sesión, y a la pantalla principal del rol si la hay.
export function NoEncontrada() {
  const { session } = useAuth();
  const { rol } = useRol();
  const destino = session ? rutaInicialPorRol(rol ?? 'candidato') : '/';

  return (
    <AuthLayout compacto campo={2} frase="Acá no hay nada, ni cavando.">
      <EncabezadoAuth icono={SearchX} titulo="No encontramos esa página">
        <p>La dirección no existe o cambió. Volvé al inicio y seguí desde ahí.</p>
      </EncabezadoAuth>
      <Link
        to={destino}
        className="h-11 bg-cta text-on-cta text-sm font-medium px-6 rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center"
      >
        {session ? 'Ir a mi inicio' : 'Ir a iniciar sesión'}
      </Link>
    </AuthLayout>
  );
}
