# Advance ICI

Aplicación para registrar y consultar expedientes del proceso de titulación,
gestionar el estado de colegiatura y respaldar actas de examen.

## Requisitos

- Node.js 22 o superior y npm.
- Para configurar Firebase: un proyecto Firebase con Authentication,
  Cloud Firestore y Cloud Storage habilitados.
- Para desplegar o migrar índices: Firebase CLI. Para ejecutar la migración
  inicial desde una máquina local, también se necesita Google Cloud CLI y una
  cuenta con permisos de lectura y escritura en Firestore.

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
3. Crea la base de datos de Firestore y el bucket de Cloud Storage.
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

   No agregues claves privadas de cuentas de servicio al `.env` del frontend.
   Los valores `VITE_*` se incluyen en el código público del navegador; la
   protección de los datos depende de Authentication, las reglas y las
   funciones del servidor.

6. En Firebase Authentication, crea la cuenta de cada persona autorizada.
   Obtén el UID de la cuenta y crea manualmente en Firestore el documento
   `usuarios/<UID>` con este contenido:

   ```json
   {
     "rol": "direccion"
   }
   ```

   Las reglas de Firestore y Storage exigen que la cuenta autenticada tenga ese
   rol. Las reglas no permiten modificar los documentos `usuarios` desde la
   aplicación.

7. Desde la raíz instala las dependencias de las funciones:

   ```powershell
   npm install
   npm install --prefix functions
   ```

   La configuración del proyecto está en `firebase.json`; el código de las
   funciones está en `functions/`.

## Preparar y desplegar una base existente

La migración inicial es necesaria para los expedientes que ya existían antes
de la búsqueda paginada. Añade el RUT normalizado, tokens de búsqueda, estado
de acta pendiente y documentos en `rutIndex/`. Si detecta RUT duplicados,
se detiene y los identifica en el error; corrígelos antes de reintentarlo.

1. Inicia sesión en Firebase CLI y selecciona el proyecto:

   ```powershell
   firebase login
   firebase use --add
   ```

   También puedes pasar `--project <ID_DEL_PROYECTO>` a cada comando de
   despliegue.

2. Despliega los índices y espera a que Firestore indique que están listos:

   ```powershell
   firebase deploy --only firestore:indexes --project <ID_DEL_PROYECTO>
   ```

3. Compila las funciones y autentica Google Cloud CLI con una cuenta que
   pueda leer y escribir en la base de Firestore del proyecto:

   ```powershell
   gcloud auth application-default login
   npm run build --prefix functions
   npm run migrate:indexes --prefix functions
   ```

   Ejecuta la migración una vez por cada base existente antes de usar la
   nueva búsqueda o crear expedientes mediante las funciones. No la ejecutes
   contra producción sin revisar primero el proyecto seleccionado.

4. Despliega las funciones, las reglas y Storage:

   ```powershell
   firebase deploy --only functions,firestore:rules,storage --project <ID_DEL_PROYECTO>
   ```

   Cloud Functions puede requerir facturación habilitada en Firebase/Google
   Cloud. Comprueba que la región `us-central1` esté disponible y que el
   despliegue termine correctamente.

5. Despliega el hosting según el proveedor utilizado por el proyecto. El
   frontend debe compilarse con el `.env` del proyecto correcto:

   ```powershell
   npm run build
   ```

   Aún no hay un destino de Hosting configurado en `firebase.json`.

## Almacenamiento y permisos

- En Firebase, la aplicación consulta Firestore y llama a funciones
  autenticadas para crear y actualizar expedientes. Las funciones comprueban
  el rol y escriben la auditoría en la subcolección
  `expedientes/<ID>/auditoria`.
- El cliente puede leer expedientes y auditorías si tiene rol `direccion`,
  pero no puede escribirlos directamente. No quites esta restricción para
  hacer funcionar la app: despliega las funciones.
- Las actas se guardan en Cloud Storage bajo `actas/<ID_EXPEDIENTE>/`.
  Solo se admiten PDFs de menos de 10 MB.
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
npm run build --prefix functions
```

Las pruebas unitarias no sustituyen una prueba de integración con Firebase.
Antes de producción, prueba en un proyecto de desarrollo la autenticación, las
reglas, creación/edición de expedientes, búsqueda paginada, auditoría y carga
de actas.
