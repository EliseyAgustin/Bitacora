-- Laburin — enlace y descripción de cada oferta
-- Las fuentes externas (Remotive, Arbeitnow, RemoteOK) traen el enlace a la oferta original y su descripción:
-- se guardan para poder mostrar el detalle y mandar a la persona a postularse en el sitio de origen.
-- Las reglas de acceso por fila (RLS) de ofertas ya cubren las columnas nuevas.

alter table public.ofertas
  add column url text,
  add column descripcion text,
  add constraint ofertas_url_http check (url is null or url ~* '^https?://'),
  add constraint ofertas_descripcion_largo check (descripcion is null or char_length(descripcion) <= 5000);

comment on column public.ofertas.url is 'Enlace a la oferta original (solo http o https).';
comment on column public.ofertas.descripcion is 'Descripción de la oferta en texto plano (máximo 5000 caracteres).';

-- Para deshacer:
-- alter table public.ofertas drop column url, drop column descripcion;
