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
no esté completa. Usa datos guardados en el
`localStorage` de ese navegador;
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

6. Antes de usar la administración de cuentas, crea la primera cuenta
   Administrador en Firebase Authentication y crea manualmente su documento
   `usuarios/<UID>` en Firestore. Esta cuenta inicial permite invitar a las
   demás desde la aplicación:

   ```json
   {
     "email": "admin@universidad.cl",
     "nombre": "Administrador inicial",
     "rol": "administrador",
     "activo": true
   }
   ```

   Los roles son fijos: `administrador`, `coordinador` y `estudiante`.
   Administración tiene control total de las funciones y puede invitar,
   cambiar roles y eliminar cuentas; Coordinación puede crear y actualizar
   expedientes y gestionar actas, pero no administrar cuentas ni cambiar
   colegiatura; Estudiante solo consulta el expediente asociado a su UID. El
   perfil del estudiante y el expediente deben apuntarse mutuamente mediante
   `usuarios/<UID>.expedienteId` y `expedientes/<ID>.estudianteUid`.
   Los perfiles antiguos `direccion`, `secretaria` y `consulta` se reconocen
   como alias de esos roles. Los perfiles `consulta` no tendrán acceso a ningún
   expediente hasta que Administración los vincule.

7. En el plan Spark, publica las reglas de Firestore antes de habilitar la
   gestión de cuentas:

   ```powershell
   firebase deploy --only firestore:rules --project <ID_DEL_PROYECTO>
   ```

   La aplicación crea la cuenta en Firebase Authentication con una sesión
   secundaria y guarda su perfil en Firestore. Las reglas permiten gestionar
   perfiles solo a un Administrador activo e impiden que se quite su propio rol.
   La eliminación definitiva requiere la función de Supabase descrita abajo:
   borra la cuenta de Authentication y su perfil, y libera el correo para volver
   a crearlo desde un CSV. Al crear un estudiante manualmente, Administración
   define su contraseña inicial. Para los demás roles y para la importación CSV,
   Firebase acepta la solicitud de correo con el enlace para definir la
   contraseña; la entrega depende del servicio de correo. Si el correo no llega,
   la aplicación muestra una contraseña temporal solo al crear la cuenta para
   comunicarla por un canal privado. La persona debe cambiarla desde **Mi cuenta**
   después de ingresar.

8. La pantalla **Administración → Cuentas y roles** permite crear cuentas,
   cambiar nombre/rol, vincular o cambiar el expediente de un estudiante,
   reenviar invitaciones y eliminar cuentas. No crea roles personalizados:
   los tres perfiles de permisos son deliberadamente fijos.

   **Importar estudiantes** acepta un archivo CSV UTF-8 exportado desde Excel,
   con las columnas exactas `nombre,email,rut`. La pantalla ofrece la plantilla,
   revisa duplicados y muestra la ficha vinculada antes de crear cuentas. `rut`
   puede quedar vacío; si se informa, debe corresponder a un expediente ya
   existente y sin estudiante vinculado. Se admiten hasta 200 filas y 1 MB por
   archivo. Cada fila se procesa por separado y el resultado queda visible;
   una falla no revierte las cuentas que ya se crearon. La importación no crea
   expedientes ni acepta contraseñas en el archivo. Las contraseñas temporales
   se muestran solo en el resultado de esa importación; guárdalas antes de
   salir de la pantalla si necesitas distribuirlas de forma privada.

### Activar la eliminación de cuentas en Spark

Firebase Spark no permite desplegar Cloud Functions. La acción **Eliminar** usa
la función `supabase/functions/eliminar-cuenta/index.ts` en el mismo proyecto
Supabase que guarda las actas. Antes de usarla:

1. En **Firebase Console → Configuración del proyecto → Cuentas de servicio**,
   genera una clave privada JSON de la cuenta de servicio del proyecto
   `advanceici`. En **Supabase → Edge Functions → Secrets**, crea el secreto
   `FIREBASE_SERVICE_ACCOUNT_JSON` con el contenido completo de ese JSON.
   Guárdalo únicamente en Supabase; no lo pongas en `.env`, en GitHub ni en el
   navegador. La cuenta de servicio debe poder leer y escribir Firestore y
   eliminar usuarios de Firebase Authentication.
2. Desde la raíz de este proyecto, inicia sesión y despliega la función:

   ```powershell
   npx supabase login
   npx supabase functions deploy eliminar-cuenta --project-ref <REF_SUPABASE> --no-verify-jwt
   ```

   `<REF_SUPABASE>` es el identificador que aparece entre `https://` y
   `.supabase.co` en `VITE_SUPABASE_URL`. Se desactiva la verificación JWT de
   Supabase porque la función comprueba el token Firebase y el perfil de
   Administrador activo por sí misma. No desactives esa comprobación interna.
3. Publica nuevamente el frontend si cambiaste su código. En **Cuentas y roles**,
   elimina una cuenta de prueba y comprueba que desaparece de la tabla y de
   Firebase Authentication. Después importa de nuevo el mismo correo desde CSV.
   Si falla la eliminación de Authentication, el perfil queda inactivo y visible
   para que puedas pulsar **Eliminar** otra vez. La función conserva los
   expedientes y su historial, pero quita el vínculo de la cuenta eliminada.

La opción de recuperación de contraseña envía el enlace con Firebase
Authentication. Configura y prueba la plantilla de correo de restablecimiento
y autoriza el dominio del despliegue en Authentication. El flujo no está
disponible en el modo de demostración.

## Configuración de Supabase para actas

1. Crea un proyecto Supabase. En **Authentication → Third-Party Auth**, agrega
   **Firebase Auth** con el `VITE_FIREBASE_PROJECT_ID` del proyecto existente.
   El login sigue ocurriendo únicamente en Firebase.
2. En el SQL Editor de Supabase, abre `supabase/actas.sql` y ejecútalo. Ya
   incluye el Firebase Project ID `advanceici`. Crea el
   bucket privado `actas` y políticas para Administración y Coordinación. No hagas
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
4. Supabase requiere las claims Firebase `role: authenticated` y `actas: true`.
   En Spark, las cuentas creadas desde la aplicación no obtienen esas claims
   automáticamente. Para conceder acceso a actas a Administradores y
   Coordinadores, ejecuta desde
   `functions/` el script con credenciales de administrador de Firebase:

   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\ruta\privada\cuenta-servicio.json"
   npm install
   node scripts/syncSupabaseClaims.mjs
   node scripts/syncSupabaseClaims.mjs --apply
   ```

   El primer comando del script solo muestra los cambios. `--apply` los
   aplica; no reemplaza otras claims de la cuenta. Úsalo para migrar cuentas
   existentes. Al cambiar manualmente el rol de una cuenta, vuelve a ejecutar
   `--apply` y pide a esa persona volver a iniciar sesión para renovar su
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

La aplicación lee y escribe expedientes directamente desde el navegador.
Antes de usarla con datos reales, publica `firestore.rules` en el proyecto
correcto. No hace falta migrar documentos para aplicar estas reglas. La
creación y edición de cuentas funcionan en Spark mediante Authentication y las
reglas de Firestore. La eliminación usa la función de Supabase indicada arriba.

```powershell
firebase login
firebase deploy --only firestore:rules --project <ID_DEL_PROYECTO>
npm run build
```

La compilación del frontend debe usar el `.env` del mismo proyecto. El hosting
se publica por separado; `firebase.json` aún no configura Firebase Hosting.

## Páginas públicas, auditoría y mantenimiento

- Las páginas de privacidad, términos, ayuda y estado están disponibles desde
  el inicio de sesión y usan parámetros de consulta para funcionar también en
  GitHub Pages. Los textos legales son borradores pendientes de aprobación;
  reemplázalos por los textos institucionales definitivos antes de producción.
  El correo de soporte y el canal de privacidad también están pendientes de
  definición.
- Las fichas ofrecen una exportación JSON con los datos del expediente y su
  historial de cambios. El PDF del acta es un archivo separado y debe
  descargarse aparte, según los permisos actuales de la cuenta.
- Administración cuenta con la pantalla **Control y auditoría**. El registro agrega
  una entrada al abrir una ficha desde la aplicación y muestra usuario,
  identificador, fecha de servidor y acción, sin duplicar nombre ni RUT. Las
  reglas permiten crear entradas solo para el usuario autenticado, con hora
  de servidor, y prohíben editarlas o borrarlas; la consulta queda restringida
  a Administración. Como el evento se registra desde el navegador, una persona
  autorizada podría fabricar entradas propias. No es una auditoría forense de
  todas las lecturas: no registra las filas mostradas por listados ni lecturas
  hechas fuera de la interfaz.
- Administración puede activar o desactivar mantenimiento desde esa misma pantalla.
  Solo el estado y el mensaje de mantenimiento se pueden leer sin iniciar
  sesión; su edición está protegida por rol. Durante mantenimiento, las reglas
  bloquean las lecturas y escrituras de expedientes para Coordinación y
  Estudiantes. El modo demo conserva estas
  opciones y sus registros localmente en el navegador.
- Las rutas públicas usan `?page=` para evitar depender de una regla de
  fallback del proveedor estático; el build genera además `404.html` para
  mostrar la pantalla propia al visitar una ruta inexistente. El estado de
  mantenimiento se vuelve a consultar al cargar la aplicación.

Después de incorporar estas reglas, publica `firestore.rules` en el proyecto
Firebase antes de probar la administración y la auditoría. Las páginas legales
deben considerarse informativas hasta la validación institucional.

## Almacenamiento y permisos

- Administración puede leer, crear y actualizar expedientes, cambiar
  colegiatura y gestionar actas. Coordinación puede leer, crear y editar
  expedientes y gestionar actas, pero no cambiar colegiatura. Estudiantes solo
  pueden leer el expediente vinculado a su UID. Firestore aplica estos límites
  aunque alguien intente llamar directamente al servicio desde el navegador.
  Los datos de expediente se siguen operando directamente en Firestore;
  la creación y edición de cuentas usan Authentication y reglas de Firestore;
  su eliminación pasa por la función de Supabase.
  El historial de cambios se guarda en cada documento y un cliente autorizado
  podría alterarlo: no es una auditoría inmutable de servidor.
- La búsqueda y el resumen leen la colección completa para incluir fichas
  anteriores sin índices. En bases grandes esto aumenta lecturas; se puede
  volver a consultas indexadas cuando se migren los documentos.
- Si una subida falla, revisa la integración Firebase Auth de Supabase, las
  claims `role` y `actas`, la URL/clave publicable y las políticas del
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
