import fs from 'node:fs';
import path from 'node:path';
import type { TestInfo } from '@playwright/test';

export type Proyecto = 'desktop' | 'mobile';
export interface Cuenta {
  email: string;
  password: string;
}

const REGISTRO_TEMPORALES = path.join(import.meta.dirname, '.cuentas-temporales.json');

export function proyectoDe(info: Pick<TestInfo, 'project'>): Proyecto {
  return info.project.name.includes('mobile') ? 'mobile' : 'desktop';
}

function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta ${nombre}. Definila en .env.e2e (ver e2e/README.md).`);
  return valor;
}

export function cuentaCompartida(proyecto: Proyecto): Cuenta {
  return {
    email: requerida(proyecto === 'mobile' ? 'E2E_EMAIL_MOBILE' : 'E2E_EMAIL'),
    password: requerida('E2E_PASSWORD'),
  };
}

// Cuenta con rol administrador (se asigna una sola vez por SQL; ver e2e/README.md). Los tests solo inician sesión con ella.
export function cuentaAdministrador(): Cuenta {
  return { email: requerida('E2E_ADMIN_EMAIL'), password: requerida('E2E_ADMIN_PASSWORD') };
}

export function passwordDePrueba(): string {
  return requerida('E2E_PASSWORD');
}

const NOMBRES = ['sofia', 'martin', 'camila', 'nicolas', 'lucia', 'bruno', 'julieta', 'federico'];
const APELLIDOS = ['gimenez', 'acosta', 'molina', 'benitez', 'rojas', 'ferreyra', 'castro', 'navarro'];

// Email de aspecto natural para cuentas que crea la propia suite por el flujo de registro.
export function emailNuevo(): string {
  const n = (lista: string[]) => lista[Math.floor(Math.random() * lista.length)];
  return `${n(NOMBRES)}.${n(APELLIDOS)}.${Math.floor(1000 + Math.random() * 8999)}@gmail.com`;
}

function leerRegistro(): Cuenta[] {
  try {
    return JSON.parse(fs.readFileSync(REGISTRO_TEMPORALES, 'utf-8')) as Cuenta[];
  } catch {
    return [];
  }
}

// Las cuentas temporales se anotan para que el teardown les borre los datos (los usuarios de Auth quedan).
export function registrarCuentaTemporal(cuenta: Cuenta): void {
  const otras = leerRegistro().filter((c) => c.email !== cuenta.email);
  fs.writeFileSync(REGISTRO_TEMPORALES, JSON.stringify([...otras, cuenta], null, 2));
}

export function cuentasTemporales(): Cuenta[] {
  return leerRegistro();
}

export function olvidarCuentasTemporales(): void {
  fs.rmSync(REGISTRO_TEMPORALES, { force: true });
}
