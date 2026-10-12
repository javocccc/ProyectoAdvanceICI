# Advance ICI

Aplicación para registrar y consultar expedientes del proceso de titulación,
gestionar el estado de colegiatura y respaldar actas de examen.

## Requisitos

- Node.js 22 o superior y npm.
- Para login y expedientes: Firebase Authentication y Cloud Firestore.
- Para PDFs: un proyecto Supabase Storage. Firebase sigue gestionando el login
  y Firestore los expedientes; no hace falta Firebase Storage ni Blaze.
- Para publicar reglas de Firestore: Firebase CLI.

## Instalación y desarrollo local

Desde la raíz del proyecto:

```powershell
npm install
npm run dev
```

La app inicia en modo demostración mientras la configuración web de Firebase
no esté completa. Usa datos guardados en el `localStorage` de ese navegador;
no son una base compartida y se pierden si se borran los datos del sitio.

Credenciales de demostración:

- Correo: `demo@advanceici.cl`
- Contraseña: `Demo2026!`

Estas credenciales son solo para probar la interfaz. No las uses como cuentas
reales ni como mecanismo de autenticación de producción.

## Configuración de Firebase

1. Crea o selecciona un proyecto Firebase.
2. En Authentication, habilita el proveedor **Correo electrónico/Contraseña**.
3. Crea la base de datos de Firestore.
4. Registra una aplicación web en la configuración del proyecto Firebase.
5. Copia `.env.example` a `.env` y completa los valores de la aplicación web:

   ```dotenv
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
   ```

   `VITE_FIREBASE_STORAGE_BUCKET` solo se usa para leer actas antiguas que ya
   estuvieran en Firebase Storage; puede quedar vacío si no existen.

   No agregues claves privadas de cuentas de servicio al `.env` del frontend.
   Los valores `VITE_*` se incluyen en el código público del navegador; la
   protección de los datos depende de Authentication y las reglas de Firestore.

6. En Firebase Authentication, crea la cuenta de cada persona autorizada.
   Obtén el UID de la cuenta y crea manualmente en Firestore el documento
   `usuarios/<UID>` con el rol correspondiente:

   ```json
   {
     "rol": "direccion"
   }
   ```

   Los valores permitidos son `direccion`, `secretaria` y `consulta`.
   Dirección puede leer, crear y editar expedientes, cambiar colegiatura y
   gestionar actas. Secretaría puede leer, crear y editar los datos académicos;
   no puede cambiar colegiatura ni gestionar actas. Consulta solo puede leer
   expedientes. La interfaz lee el rol de este documento y las reglas de
   Firestore verifican cada operación. Sin documento o con un rol desconocido,
   la cuenta no entra al espacio de trabajo. La aplicación no modifica
   documentos `usuarios`. En la ficha, Secretaría y Consulta ven
   «Reservado para el rol Dirección» en lugar del formulario de colegiatura,
   el historial de cambios y la sección de actas PDF.

7. Instala dependencias con `npm install`. El directorio `functions/` conserva
   una implementación anterior; la aplicación actual no lo llama ni lo despliega.

## Configuración de Supabase para actas

1. Crea un proyecto Supabase. En **Authentication → Third-Party Auth**, agrega
   **Firebase Auth** con el `VITE_FIREBASE_PROJECT_ID` del proyecto existente.
   El login sigue ocurriendo únicamente en Firebase.
2. En el SQL Editor de Supabase, abre `supabase/actas.sql` y ejecútalo. Ya
   incluye el Firebase Project ID `advanceici`. Crea el
   bucket privado `actas` y políticas para cuentas de Dirección. No hagas
   público el bucket.
3. En `.env` completa la URL del proyecto y su **publishable key**:

   ```dotenv
   VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

   Si usas `.env.development`, completa las mismas variables allí para la
   vista local. Reinicia `npm run dev` tras modificar cualquiera de estos
   archivos. Nunca pongas la `service_role` o una secret key en `VITE_*`.
   Para GitHub Pages, configura `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_PUBLISHABLE_KEY` como variables del repositorio en
   **Settings → Secrets and variables → Actions → Variables**. El flujo
   `.github/workflows/deploy.yml` las incorpora a la compilación.
4. Supabase requiere la claim Firebase `role: authenticated`. Las políticas
   también requieren `direccion: true`. Para asignarlas a cuentas cuyo
   documento `usuarios/<uid>` tenga `rol: direccion`, ejecuta desde
   `functions/` el script con credenciales de administrador de Firebase:

   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\ruta\privada\cuenta-servicio.json"
   npm install
   node scripts/syncSupabaseClaims.mjs
   node scripts/syncSupabaseClaims.mjs --apply
   ```

   El primer comando del script solo muestra los cambios. `--apply` los
   aplica; no reemplaza otras claims de la cuenta. Repite el proceso al dar
   de alta o revocar el rol de Dirección. Al pasar una cuenta de Dirección a
   Secretaría o Consulta, vuelve a ejecutar `--apply` para quitar la claim
   `direccion`, y pide a esa persona cerrar e iniciar sesión para renovar su
   token. Las credenciales de administrador
   se configuran fuera del repositorio mediante Application Default
   Credentials. Descarga la cuenta de servicio solo desde la configuración
   de Firebase si tienes acceso de administrador; guarda ese JSON fuera del
   proyecto y no lo compartas ni lo subas a GitHub. Después de aplicar las
   claims, vuelve a iniciar sesión para obtener un token nuevo.

   Para comprobar la integración sin tocar expedientes reales, con esa misma
   variable de credenciales ejecuta `node scripts/verifySupabaseStorage.mjs`
   desde `functions/`. El verificador sube un PDF sintético, comprueba que una
   visita sin sesión no puede descargarlo y elimina el archivo al terminar.

Los PDFs nuevos se suben directamente desde el navegador a Supabase con el
token Firebase, usando TUS para mostrar el progreso. El bucket admite solo
PDFs de menos de 10 MB. Firestore guarda la ruta `supabase/<expediente>/<id>`;
las descargas utilizan el bucket privado y una URL temporal al abrir el acta.
Si ya existían actas en Firebase Storage, la aplicación conserva la lectura
y eliminación de esas rutas `actas/...` siempre que el bucket antiguo siga
disponible.

## Publicar reglas de Firestore

La versión actual lee y escribe expedientes directamente desde el navegador.
Antes de usarla con datos reales, publica `firestore.rules` en el proyecto
correcto. No hace falta migrar documentos ni desplegar Cloud Functions.

```powershell
firebase login
firebase deploy --only firestore:rules --project <ID_DEL_PROYECTO>
npm run build
```

La compilación del frontend debe usar el `.env` del mismo proyecto. El hosting
se publica por separado; `firebase.json` aún no configura Firebase Hosting.

## Almacenamiento y permisos

- Dirección puede crear y actualizar todo el expediente; Secretaría solo los
  campos académicos. Consulta puede leerlo. Firestore aplica estos límites
  aunque alguien intente llamar directamente al servicio desde el navegador.
  El historial se guarda en cada documento junto con el cambio.
  Así funciona sin Blaze, pero un cliente autorizado podría alterar el
  historial: no es una auditoría inmutable de servidor.
- La búsqueda y el resumen leen la colección completa para incluir fichas
  anteriores sin índices. En bases grandes esto aumenta lecturas; se puede
  volver a consultas indexadas cuando se migren los documentos.
- Si una subida falla, revisa la integración Firebase Auth de Supabase, las
  claims `role` y `direccion`, la URL/clave publicable y las políticas del
  bucket. La pantalla mostrará el error en lugar de esperar indefinidamente.
- Sin configuración Firebase, los datos de demostración viven en el
  almacenamiento local del navegador. No se sincronizan entre dispositivos.
- Si los datos locales están dañados, la app muestra un error y no los
  reemplaza por ejemplos automáticamente. Para reiniciar la demostración,
  borra los datos del sitio desde la configuración del navegador; esto elimina
  también los expedientes guardados localmente.

## Pruebas y compilación

Desde la raíz:

```powershell
npm test
npm run build
```

Las pruebas unitarias no sustituyen una prueba de integración con Firebase.
Antes de producción, prueba en un proyecto de desarrollo la autenticación, las
reglas, creación/edición de expedientes, búsqueda paginada, auditoría y carga
de actas.
