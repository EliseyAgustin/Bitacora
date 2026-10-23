export type Modalidad = 'remoto' | 'hibrido' | 'presencial';

export interface Oferta {
  id: string;
  user_id: string;
  empresa: string;
  rol: string;
  ubicacion: string | null;
  modalidad: Modalidad | null;
  stack_tecnologico: string[];
  fuente: string | null;
  fecha_publicacion: string | null;
  // Enlace a la oferta original y su descripción en texto plano (las fuentes externas los traen; las ofertas manuales, a veces).
  url: string | null;
  descripcion: string | null;
  puntaje_scoring: number | null;
  created_at: string;
  updated_at: string;
}

export type OfertaInput = Omit<
  Oferta,
  'id' | 'user_id' | 'puntaje_scoring' | 'created_at' | 'updated_at' | 'url' | 'descripcion'
> & { url?: string | null; descripcion?: string | null };
