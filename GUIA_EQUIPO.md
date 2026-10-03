# Guía de trabajo y commits Advance ICI

Esta guía es para Javier Carrasco, Matias Olivares y Fabian Silva. La primera entrega evalúa el frontend del sistema de expedientes de titulación. Javier entrega la base, coordina las ramas y revisa los pull requests. Matias completa el registro de expedientes. Fabian completa la ficha, la colegiatura y el acta. Cada integrante debe realizar al menos diez commits propios con cambios reales, usando su propia cuenta y configuración Git. Javier ya publicó sus commits en `main`; no deben atribuirse a otra persona.

## 1 Alcance común

El usuario principal es Dirección ICI. El sistema contiene inicio de sesión, panel, registro, búsqueda y ficha. Un expediente guarda nombre, RUT, egreso, examen, nota, comisión, acta y estado de colegiatura. Durante la primera evaluación se usan datos ficticios. El login institucional queda pendiente porque el equipo no dispone de ese acceso. El login real preparado usa correo y contraseña de Firebase Authentication.

No se deben subir datos reales de estudiantes, contraseñas, el archivo `.env` ni los documentos de la carpeta `Contexto`. El repositorio será público. Las reglas `firestore.rules` y `storage.rules` deben publicarse antes de guardar datos en Firebase.

## 2 Contratos que nadie debe romper

- `src/types/expediente.ts` define `Expediente`, `NuevoExpediente`, `Comision`, `Acta` y `CambioColegiatura`. Si hace falta cambiar un campo, Matias o Fabian propone primero el cambio a Javier.
- `src/services/expedientes.ts` ofrece `listarExpedientes`, `crearExpediente` y `actualizarExpediente`. Las pantallas llaman estas funciones; no escriben directamente en Firestore o localStorage.
- `src/context/AuthContext.tsx` ofrece `useAuth()`. `usuario` identifica a quien ingresó; `ingresar` y `salir` cambian la sesión.
- `src/App.tsx` controla qué pantalla se muestra. Javier integra cambios de navegación aquí. Los compañeros entregan sus páginas sin editar App salvo acuerdo previo.
- `src/styles.css` contiene colores y estilos comunes. Cada compañero puede crear un CSS propio de su página, importado desde esa página, para evitar conflictos.
- Los valores de colegiatura son exactamente `al-dia`, `no-al-dia` y `sin-informar`. Los textos visibles están en `src/utils/formato.ts`.

## 3 Git y GitHub paso a paso

El repositorio público del grupo ya existe: https://github.com/javocccc/ProyectoAdvanceICI. Javier administra `main` e invita a Matias y Fabian como colaboradores. La carpeta `Contexto` está excluida con `.gitignore` por contener material de clases y datos personales.

Cada compañero clona con `git clone https://github.com/javocccc/ProyectoAdvanceICI.git`, entra con `cd ProyectoAdvanceICI` y crea su rama: `git switch -c feat/matias-registro` o `git switch -c feat/fabian-ficha`. Antes de trabajar, ejecuta `npm install` y `npm run dev`. Para cada cambio revisa `git status`, usa `git add RUTA_DEL_ARCHIVO` y luego `git commit -m "mensaje concreto"`. No use `git add .` sin revisar qué se incluirá. Al terminar sube con `git push -u origin NOMBRE_RAMA` y abre un pull request hacia `main`.

Javier revisa que el pull request compile con `npm run build`, que la página funcione, que el autor tenga sus diez commits y que no haya `.env` ni datos reales. Integra primero el trabajo de Matias y después el de Fabian, actualizando la rama de Fabian desde `main` si fuera necesario. La fusión debe hacerse en GitHub con el pull request visible para que quede registro del trabajo. No hacer `force push` a `main`.

## 4 Commits de Javier

Los mensajes siguientes corresponden a cambios ya construidos en la base. Se conservan como commits separados en Git, con Javier como autor configurado en su computador. El mínimo solicitado es diez; Javier tiene commits adicionales de mantenimiento y seguridad.

1. `chore: iniciar proyecto React y TypeScript` — configuración Vite, TypeScript, HTML y exclusiones Git.
2. `feat: definir modelo de expediente y datos ficticios` — interfaces y registros de demostración.
3. `feat: preparar acceso a Firebase y servicio de expedientes` — configuración por `.env` y funciones de lectura y escritura.
4. `feat: compartir autenticacion con useContext` — `AuthProvider`, `useAuth`, sesión demo y login Firebase.
5. `feat: crear pantalla de ingreso` — formulario, mensajes y estado de carga.
6. `feat: construir navegacion y sistema visual` — estructura, iconos y estilos generales.
7. `feat: mostrar resumen del panel principal` — cifras, alertas y accesos rápidos.
8. `feat: buscar y filtrar expedientes` — tabla compartida, estado visual y búsqueda.
9. `feat: agregar formulario y ficha inicial` — páginas base conectadas al servicio.
10. `docs: explicar instalacion, Firebase y trabajo en equipo` — README, reglas y esta guía Word.
11. `fix: actualizar Firebase y corregir dependencia gRPC` — resuelve las alertas de `npm audit`.
12. `docs: publicar enlace GitHub y preparar reglas de actas` — agrega el enlace real y permite borrar un acta reemplazada en Storage.

## 5 Los diez commits de Matias

Rama `feat/matias-registro`. Archivo principal: `src/pages/NuevoExpedientePage.tsx`. Puede crear `src/pages/NuevoExpedientePage.css` y `src/utils/rut.ts`. Debe usar `crearExpediente()` y `NuevoExpediente`; no crear otro tipo de expediente ni editar la navegación general.

1. `feat: validar formato y digito del RUT` — crear `src/utils/rut.ts`, explicar el algoritmo y mostrar ejemplos válidos e inválidos.
2. `feat: señalar campos obligatorios del registro` — mensajes junto a nombre, RUT, egreso y fecha, conservando lo escrito si falta algo.
3. `feat: agregar nota de examen con rango valido` — campo numérico en escala 1,0 a 7,0, con mensaje claro.
4. `feat: registrar profesor guia y dos informantes` — campos obligatorios de `Comision` y uno adicional opcional.
5. `feat: evitar docentes repetidos en la comision` — validación antes de guardar; anotar que esta regla debe confirmarse con el stakeholder.
6. `feat: informar cuando el RUT ya existe` — mostrar el error de `crearExpediente()` y permitir revisar el expediente existente.
7. `feat: mejorar estados de guardado y error` — deshabilitar el botón al enviar, avisar si falla y conservar el formulario.
8. `feat: completar registro en un solo formulario` — guardar nota y comisión junto con datos del estudiante y abrir la ficha.
9. `style: adaptar formulario a movil y teclado` — CSS propio, etiquetas conectadas y orden de tabulación útil.
10. `docs: explicar formulario y validaciones` — documentar campos, funciones y cómo cambiar un texto o tamaño durante la evaluación.

Antes del pull request, Matias debe probar RUT inválido, campos vacíos, nota fuera de rango, docente repetido, RUT duplicado y guardado correcto. Debe verificar que la ficha recién creada muestra los datos.

## 6 Los diez commits de Fabian

Rama `feat/fabian-ficha`. Archivo principal: `src/pages/ExpedienteDetallePage.tsx`. Puede crear `src/pages/ExpedienteDetallePage.css`, `src/components/EstadoColegiaturaForm.tsx` y `src/services/actas.ts`. Debe usar `actualizarExpediente()` y los tipos compartidos. La subida real del PDF usa Firebase Storage; en demostración debe explicar con claridad que el archivo no queda respaldado en un servidor.

1. `feat: organizar ficha completa del expediente` — datos académicos, comisión, acta y colegiatura legibles.
2. `feat: agregar selector de estado de colegiatura` — opciones Al día, No al día y Sin informar, con observación opcional.
3. `feat: registrar historial de cambios de colegiatura` — estado anterior, nuevo, fecha, usuario y observación.
4. `feat: advertir expedientes con pago pendiente` — aviso visible cuando el estado es No al día.
5. `feat: seleccionar o arrastrar acta PDF` — zona accesible para elegir archivo.
6. `feat: validar formato y tamaño del acta` — solo PDF, máximo 10 MB, errores explicativos.
7. `feat: subir acta a Firebase Storage con progreso` — servicio separado; asociar ruta al expediente.
8. `feat: abrir descargar y reemplazar acta` — acciones para documentos ya cargados y confirmación de reemplazo.
9. `style: adaptar ficha y carga a pantallas pequenas` — CSS propio, estados de foco y lectura móvil.
10. `docs: explicar colegiatura y almacenamiento` — documentar cambio de estado, historial, ruta del PDF y límites del modo demo.

Antes del pull request, Fabian debe probar las tres opciones de colegiatura, cancelar sin guardar, error de guardado, PDF inválido, PDF mayor de 10 MB, progreso, reemplazo y vista móvil. La subida real se verifica solo cuando el proyecto Firebase esté configurado.

## 7 Firebase y datos de demostración

Mientras no exista `.env`, `src/services/firebase.ts` devuelve servicios nulos. `AuthContext` permite únicamente las credenciales ficticias mostradas en la pantalla; `sessionStorage` conserva esa sesión durante la pestaña. `src/services/expedientes.ts` usa `localStorage` para guardar los expedientes ficticios del navegador. No es un mecanismo de seguridad ni respaldo.

Cuando Javier cree Firebase: habilita Authentication por correo y contraseña y Firestore; copia `.env.example` a `.env`; agrega los seis valores de configuración web; publica las reglas; crea una cuenta de Dirección; y crea en Firestore `usuarios/UID` con `rol: direccion`. Entonces el login y los expedientes usan Firebase. Cloud Storage requiere el plan Blaze; si decide activarlo, habilita Storage y publica `storage.rules`. Las pruebas con PDFs deben hacerse con archivos inventados.

## 8 Cambios rápidos que pueden pedir en la evaluación

- Tamaño de letras del título del panel: buscar `.page-heading h1` en `src/styles.css` y cambiar `font-size`.
- Color azul principal: cambiar `--blue` en `:root` de `src/styles.css`.
- Espacio dentro de un botón: cambiar `padding` en `.button`.
- Texto de un botón o encabezado: editar la cadena visible en el componente TSX correspondiente.
- Agregar un campo al expediente: primero cambiar la interface en `src/types/expediente.ts`, luego el formulario, después la ficha y finalmente el almacenamiento.
- Explicar `useContext`: `AuthProvider` entrega un valor compartido; `useAuth()` lo lee; cuando cambia `usuario`, React actualiza el menú y la pantalla. La contraseña nunca se guarda en el contexto ni en almacenamiento web.

## 9 Criterio de entrega

La entrega grupal está lista cuando las tres ramas están integradas, cada integrante tiene al menos diez commits propios verificables, `npm run build` termina sin errores, las pantallas funcionan en computador y móvil, los datos ficticios se identifican como tales y no hay archivos sensibles publicados. El acceso institucional, los respaldos reales y la integración con plataformas universitarias quedan fuera de esta primera evaluación y deben presentarse como trabajo futuro.
