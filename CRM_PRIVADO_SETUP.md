# ARPERTING V5.0 — Captación real + CRM privado (preparación)

**Estado: código preparado; NO desplegado, NO conectado a clientes reales.** GitHub Pages solo hospeda HTML estático.

## Arquitectura
1. `index.html`: diagnóstico orientativo y botón de WhatsApp actual. El envío seguro a CRM está deshabilitado hasta configurar proveedor.
2. `supabase/functions/lead-intake/index.ts`: función pública POST que exige consentimiento, contacto y token Cloudflare Turnstile validado en servidor. Inserta mediante clave secreta que NUNCA se expone en la web.
3. `supabase/migrations/001_arperting_crm.sql`: tablas privadas, políticas RLS para staff autorizado y registros de actividad.
4. `crm-privado.html`: autenticación por correo Supabase y panel protegido por RLS; no confundirlo con `crm.html` (demo pública).

## Configuración pendiente (administrador)
1. Crear proyecto privado en https://supabase.com y aplicar SQL desde SQL Editor.
2. Configurar Supabase Auth, correo SMTP y lista cerrada de usuarios. Crear la cuenta del administrador y ejecutar el INSERT del final de la migración; desactivar el registro abierto de nuevos usuarios, permitir solo cuentas invitadas.
3. Registrar el dominio de GitHub Pages y crear un widget Turnstile en https://dash.cloudflare.com. Restringir host; copiar la **site key pública** al frontend y guardar **secret key** únicamente como secreto de Edge Function.
4. Configurar secretos de Supabase Edge Function: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, `ALLOWED_ORIGIN=https://marcketingdigital-cloud.github.io`, `TURNSTILE_EXPECTED_HOST=marcketingdigital-cloud.github.io`.
5. Desplegar con Supabase CLI `supabase functions deploy lead-intake --no-verify-jwt` y comprobar CORS, CAPTCHA, envíos reales, duplicados y abuso. Añadir rate limiting a nivel gateway/WAF antes de producción.
6. Colocar URL del proyecto y clave **publishable** en `arperting-backend-config.js` para el panel privado. Nunca poner una clave secreta en JS público.
7. Añadir `crm-privado.html` a las URLs de redirección permitidas de Supabase Auth, habilitar MFA para el equipo y revisar privilegios.
8. Publicar política de privacidad y aviso sobre finalidades, conservación, eliminación, proveedor de datos y transferencias internacionales antes de recoger datos reales.
9. Configurar monitoreo, notificaciones de nuevas consultas y pruebas automatizadas de RLS (anon denegado, staff autorizado). Requiere comprobación real del despliegue.

**Seguridad**: RLS controla acceso a datos, no el nombre/URL del archivo. `crm.html` es demostrativo y no debe recibir datos personales. Sin los pasos anteriores, NO activar captura en producción.

Documentación: https://supabase.com/docs/guides/database/postgres/row-level-security y https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
