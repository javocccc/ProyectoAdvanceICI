# Advance ICI

Panel de gestión de expedientes de titulación para el proyecto académico del Programa Advance de Ingeniería Civil Industrial. Esta primera versión contiene el acceso, el panel principal, búsqueda, una ficha de lectura y un formulario base. Los registros que aparecen sin Firebase son completamente ficticios.

## Ejecutar el proyecto

Se necesita Node.js 20.19 o superior, o 22.12 o superior.

```bash
npm install
npm run dev
```

Abra la dirección que muestra Vite. Si no existe `.env`, ingrese con `demo@advanceici.cl` y `Demo2026!`. Esas credenciales solo activan una demostración local en el navegador. No son un sistema de seguridad.

## Conectar Firebase

1. Cree un proyecto en [Firebase Console](https://console.firebase.google.com/) y registre una aplicación web.
2. Habilite Authentication con proveedor **Correo electrónico/contraseña**, Cloud Firestore y Cloud Storage.
3. Copie `.env.example` a `.env` y complete los seis valores de configuración web entregados por Firebase. Reinicie Vite.
4. Publique `firestore.rules` y `storage.rules` en la consola o mediante Firebase CLI.
5. Cree una cuenta autorizada en Authentication. En Firestore, cree `usuarios/<uid>` con el campo `rol` igual a `direccion` para ese usuario. El UID debe coincidir exactamente con el de Authentication.
6. Al ingresar con esa cuenta, la aplicación consultará la colección `expedientes`. Comenzará vacía hasta registrar expedientes. Nunca cargue los datos ficticios como si fueran datos reales.

La configuración web no es una contraseña. La protección efectiva está en las reglas de Firestore y Storage y en la gestión de usuarios autorizados. El modo de demostración se activa únicamente si faltan los valores de Firebase.

`package.json` fija `@grpc/grpc-js` en la versión corregida 1.14.5 porque Firestore incluye una versión antigua de ese paquete para Node. Aunque esta app se ejecuta en el navegador, npm también revisa esa dependencia al instalar. Para mantener el proyecto seguro, actualice dependencias con cuidado y compruebe `npm audit` y `npm run build`; evite `npm audit fix --force` sin revisar los cambios.

## Mapa simple del código

| Archivo | Para qué sirve | Qué cambiar durante la evaluación |
| --- | --- | --- |
| `src/styles.css` | Colores, tamaños, espacios y diseño adaptable | Variables de `:root`; `font-size` para letras; `padding` para espacios |
| `src/App.tsx` | Elige la pantalla y carga expedientes | Menú, títulos del encabezado, ruta inicial |
| `src/context/AuthContext.tsx` | Comparte la sesión mediante `useContext` | Lógica de ingreso y salida |
| `src/pages/LoginPage.tsx` | Formulario de ingreso | Textos, campos, botón y mensajes |
| `src/pages/PanelPage.tsx` | Resumen, búsqueda y recientes | Orden y texto de secciones |
| `src/pages/ExpedientesPage.tsx` | Lista, filtro y búsqueda | Filtros y texto de búsqueda |
| `src/types/expediente.ts` | Interfaces compartidas | Campos del expediente |
| `src/services/expedientes.ts` | Lectura y escritura de datos | Cambio de origen de datos |
| `src/services/firebase.ts` | Inicializa Firebase cuando existe `.env` | Configuración, no credenciales privadas |

### Cómo funciona el login con useContext

`main.tsx` envuelve `<App/>` con `<AuthProvider>`. Ese proveedor guarda `usuario` en un estado de React. Cuando alguien ingresa o sale, cambia ese estado. Las pantallas llaman a `useAuth()`, que internamente usa `useContext(AuthContext)` para leer el valor compartido. React vuelve a mostrar las pantallas que lo usan cuando cambia `usuario`. En modo real, Firebase verifica correo y contraseña; en demostración, se usa una cuenta ficticia y `sessionStorage` recuerda la sesión durante la pestaña actual. La contraseña nunca se guarda en `sessionStorage`.

`localStorage` guarda los expedientes ficticios creados en el modo de demostración, por lo que sobreviven a una recarga. No se debe usar para expedientes reales. Cuando Firebase está configurado, el servicio `expedientes.ts` consulta Firestore.

## Trabajo en equipo

Javier mantiene `App.tsx`, `styles.css`, los tipos compartidos y los servicios. Matias trabaja principalmente en `NuevoExpedientePage.tsx` y validaciones del formulario. Fabian trabaja principalmente en `ExpedienteDetallePage.tsx`, historial de colegiatura y actas. La guía Word del proyecto detalla los diez commits sugeridos para cada integrante, los comandos Git y la integración de ramas.

Los archivos originales de `Contexto/` están excluidos del repositorio público porque contienen datos personales y material de clases. Tampoco se publica `.env`.
