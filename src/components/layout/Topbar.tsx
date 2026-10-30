import { Menu } from 'lucide-react';
import logoIcono from '@/assets/logo/laburin-logo-icono.svg';

interface TopbarProps {
  onMenuClick: () => void;
}

// Solo en el celular: en escritorio el menú lateral ya nombra el producto, y una barra vacía no aporta nada.
export function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="md:hidden fixed top-0 inset-x-0 z-30 bg-background border-b border-outline-variant flex items-center h-14 px-3 gap-2">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Abrir menú"
        className="p-2.5 -ml-1 shrink-0 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
      >
        <Menu className="w-5 h-5" />
      </button>
      <img src={logoIcono} alt="" className="w-8 h-8 rounded-full shrink-0" />
      <span className="font-heading font-bold text-xl text-primary leading-none">Laburin</span>
    </header>
  );
}
