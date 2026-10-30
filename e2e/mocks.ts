import type { Page } from '@playwright/test';

// Remotive, Arbeitnow y RemoteOK son servicios de terceros: se interceptan para que el import sea determinista.
// Lo que se verifica es la lógica de la aplicación (normalizar, deduplicar, insertar), no la disponibilidad de esos sitios.
// El smoke contra los servicios reales vive aparte (import-real.spec.ts).
export interface JobRemotive {
  title: string;
  company_name: string;
  candidate_required_location: string;
  tags: string[];
  publication_date: string;
  url?: string;
  description?: string;
}

export interface JobArbeitnow {
  title: string;
  company_name: string;
  location: string;
  remote: boolean;
  tags: string[];
  created_at: number;
  url?: string;
  description?: string;
}

export interface JobRemoteOK {
  company: string;
  position: string;
  location: string;
  tags: string[];
  date: string;
  url?: string;
  description?: string;
}

const CORS = { 'access-control-allow-origin': '*' };

export async function mockearFuentes(
  page: Page,
  remotive: JobRemotive[],
  arbeitnow: JobArbeitnow[],
  remoteok: JobRemoteOK[] = []
) {
  await page.route('https://remotive.com/api/remote-jobs*', (route) =>
    route.fulfill({ status: 200, headers: CORS, json: { jobs: remotive } })
  );
  await page.route('https://www.arbeitnow.com/api/job-board-api*', (route) =>
    route.fulfill({ status: 200, headers: CORS, json: { data: arbeitnow } })
  );
  // RemoteOK devuelve un arreglo cuyo primer elemento es el aviso legal.
  await page.route('https://remoteok.com/api*', (route) =>
    route.fulfill({ status: 200, headers: CORS, json: [{ legal: 'API Terms of Service' }, ...remoteok] })
  );
}

export const remotive = (
  company_name: string,
  title: string,
  location: string,
  tags: string[],
  extra: Partial<JobRemotive> = {}
): JobRemotive => ({
  company_name,
  title,
  candidate_required_location: location,
  tags,
  publication_date: '2026-09-30T10:00:00',
  ...extra,
});

export const arbeitnow = (
  company_name: string,
  title: string,
  location: string,
  tags: string[],
  extra: Partial<JobArbeitnow> = {}
): JobArbeitnow => ({
  company_name,
  title,
  location,
  remote: true,
  tags,
  created_at: 1790000000,
  ...extra,
});

export const remoteok = (
  company: string,
  position: string,
  location: string,
  tags: string[],
  extra: Partial<JobRemoteOK> = {}
): JobRemoteOK => ({
  company,
  position,
  location,
  tags,
  date: '2026-10-01T10:00:00+00:00',
  ...extra,
});
