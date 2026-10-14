import { PASSWORD_MIN } from '@/lib/validacionAuth';

export interface RequisitoPassword {
  id: 'largo' | 'mayusculas' | 'numero' | 'simbolo';
  texto: string;
  cumplido: boolean;
  // Solo el largo se exige (es lo que valida el formulario); el resto orienta para elegir una contraseña más fuerte.
  obligatorio: boolean;
}

export function requisitosPassword(password: string): RequisitoPassword[] {
  return [
    { id: 'largo', texto: `Al menos ${PASSWORD_MIN} caracteres`, cumplido: password.length >= PASSWORD_MIN, obligatorio: true },
    { id: 'mayusculas', texto: 'Mayúsculas y minúsculas', cumplido: /[a-z]/.test(password) && /[A-Z]/.test(password), obligatorio: false },
    { id: 'numero', texto: 'Al menos un número', cumplido: /\d/.test(password), obligatorio: false },
    { id: 'simbolo', texto: 'Algún símbolo (por ejemplo ! ? - _)', cumplido: /[^a-zA-Z0-9]/.test(password), obligatorio: false },
  ];
}
