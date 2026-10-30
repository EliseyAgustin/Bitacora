# Guía de configuración de Supabase

Lo que hay que dejar configurado **en el panel de Supabase** (no se puede hacer desde el código) para que la aplicación funcione completa, en especial la recuperación de contraseña con correos reales. Está pensada para hacerla en orden, de arriba hacia abajo, y verificarla al final con la lista del punto 7.

> Los nombres de los menús del panel cambian de vez en cuando. Si alguno no coincide, buscá la opción por su nombre dentro de **Authentication**.

## 1. Qué se necesita
- Acceso al panel del proyecto de Supabase (https://supabase.com/dashboard).
- La dirección de producción: `https://bitacora-empleo.vercel.app`.
- Un servicio de correo para el punto 4 (ver las opciones ahí).

## 2. Direcciones permitidas (obligatorio)
**Authentication → URL Configuration**

| Campo | Valor |
|---|---|
| **Site URL** | `https://bitacora-empleo.vercel.app` |
| **Redirect URLs** | `https://bitacora-empleo.vercel.app/**` y `http://localhost:3000/**` (para desarrollo) |

Si querés probar versiones de prueba (previews) de Vercel, sumá `https://*-<tu-cuenta>.vercel.app/**`.

**Por qué importa:** la aplicación le pide a Supabase que el enlace del mail lleve a `/nueva-contrasena`. Si esa dirección no está en la lista, Supabase la rechaza o manda a la persona a la página de inicio, y la recuperación parece "rota".

## 3. Plantilla del mail de recuperación (recomendado)

> **Actualizada (octubre de 2026):** la plantilla tiene un diseño nuevo, con la misma identidad visual que el Login (franjas azul, naranja, salvia y azul noche, titular grande y botón amarillo). Si ya habías pegado la anterior, hay que pegar esta de nuevo: los cambios del repositorio no llegan solos al panel de Supabase.
**Authentication → Email Templates → Reset Password** (en versiones nuevas: *Authentication → Emails → Templates*)

1. **Subject (asunto):** `Cambiá tu contraseña de Bitácora`
2. **Message body:** abrí [`docs/plantillas-email/recuperar-contrasena.html`](plantillas-email/recuperar-contrasena.html), copiá todo su contenido y pegalo en el cuerpo del mensaje (en modo HTML / "Source").
3. Guardá. No borres `{{ .ConfirmationURL }}`: es el enlace que Supabase completa. Un test automático del repositorio cuida que siga ahí.

Sin esto, el mail sale en inglés y con el diseño por defecto de Supabase.

## 4. Correo propio (SMTP) — necesario para que lo reciba cualquier persona
**El servicio de correo que trae Supabase por defecto** (según su documentación):
- solo envía a direcciones de **miembros de tu organización** en Supabase;
- tiene un tope de **2 mensajes por hora** para todo el proyecto;
- no está pensado para producción.

Con eso, la profe (u otra persona) que pida recuperar su contraseña **no recibe nada**. Hay que conectar un servicio propio:

**Authentication → Emails → SMTP Settings → Enable custom SMTP**, y completar lo que te da el servicio:
`Sender email`, `Sender name` (por ejemplo, *Bitácora*), `Host`, `Port`, `Username` y `Password`.

Opciones habituales (todas tienen plan gratuito; **revisá las condiciones vigentes en cada sitio**, cambian):

| Servicio | Lo que hay que saber |
|---|---|
| **Brevo** | Permite verificar **una dirección de correo** como remitente (sirve con una cuenta de Gmail), sin necesidad de tener un dominio propio. Es la opción más simple para una demo. |
| **Resend** | Muy sencillo, pero para enviar a cualquier destinatario hay que **verificar un dominio propio**. Sin dominio, solo envía a la dirección de tu propia cuenta. |

Después de conectarlo, en **Authentication → Rate Limits** se puede subir el tope de mails por hora.

## 5. Ajustes de seguridad de Auth (recomendado)
**Authentication → Providers → Email** (y secciones vecinas):

| Ajuste | Qué poner | Por qué |
|---|---|---|
| **Minimum password length** | `8` | La aplicación ya exige 8 en las pantallas, pero el servidor por defecto acepta 6: quien llame a la API directo se saltearía la regla. |
| **Leaked password protection** | Activarla si tu plan la incluye | Rechaza contraseñas que figuran en filtraciones públicas. |
| **Confirm email** | A decidir (ver abajo) | Cambia el registro. |
| **Rate Limits** | Dejar los valores por defecto | Frenan el abuso de los intentos de ingreso y de los mails. |

**Sobre "Confirm email":** hoy el registro entra directo a la aplicación (confirmación desactivada). Si la activás, la persona tiene que abrir un mail antes de ingresar: la aplicación lo avisa ("Todavía no confirmaste tu email"), pero necesitás el correo propio del punto 4 funcionando y conviene traducir también la plantilla **Confirm signup**. Para una demostración, dejarla desactivada es lo más simple.

## 6. Cuenta de administrador
El rol de administrador **no se puede obtener desde la aplicación**: se asigna a mano. Primero registrá la cuenta desde la aplicación y después, en **SQL Editor**:

```sql
insert into public.roles_usuario (user_id, rol)
select id, 'administrador' from auth.users where email = 'EMAIL_DE_LA_CUENTA'
on conflict (user_id) do update set rol = 'administrador';
```

Para quitarlo: `update public.roles_usuario set rol = 'candidato' where user_id = (select id from auth.users where email = 'EMAIL_DE_LA_CUENTA');`

## 7. Verificación (hacela con tu email real, en producción)
1. Entrá a https://bitacora-empleo.vercel.app → **¿Olvidaste tu contraseña?** → escribí tu email → *Enviar enlace*. Aparece "Revisá tu correo".
2. **El mail llega** (mirá también el spam), **en español** y con el diseño de Bitácora.
3. El botón **abre la pantalla "Elegí tu contraseña nueva"** de Bitácora (no la página de inicio ni una de error).
4. Elegí una contraseña, guardá, cerrá sesión y **entrá con la nueva**.
5. Volvé a abrir **el mismo enlace del mail**: tiene que mostrar "No pudimos validar el enlace" (los enlaces se usan una sola vez).
6. Iniciá sesión con la cuenta de administrador: **cae en Candidatos**.

## 8. Si algo falla
| Síntoma | Causa probable |
|---|---|
| El enlace del mail lleva al inicio o al login | Falta la dirección en **Redirect URLs** (punto 2). |
| No llega ningún mail | No hay SMTP propio (punto 4), el remitente no está verificado, o está en spam. |
| "Hiciste muchos intentos seguidos" | Se alcanzó el tope de mails por hora o la espera de 60 segundos para el mismo email. |
| El mail sale en inglés | No se pegó la plantilla (punto 3). |
| El registro pide confirmar el email | Está activada *Confirm email* (punto 5). |
