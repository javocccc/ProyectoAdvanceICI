// Ejecutar con credenciales de administrador de Firebase, desde functions/.
// Por defecto solo muestra qué cuentas cambiaría; --apply modifica Authentication.
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const aplicar = process.argv.includes("--apply");
initializeApp({ credential: applicationDefault(), projectId: "advanceici" });
const autenticacion = getAuth();
const firestore = getFirestore();
let pagina;
let revisadas = 0;
let cambios = 0;
let gestoresActas = 0;

do {
  const resultado = await autenticacion.listUsers(1000, pagina);
  pagina = resultado.pageToken;
  for (const cuenta of resultado.users) {
    revisadas++;
    const usuario = await firestore.doc(`usuarios/${cuenta.uid}`).get();
    const rol = usuario.data()?.rol;
    const activo = usuario.data()?.activo !== false;
    const esAdministrador = activo && (rol === "administrador" || rol === "direccion");
    const puedeGestionarActas =
      activo && (esAdministrador || rol === "coordinador" || rol === "secretaria");
    if (puedeGestionarActas) gestoresActas++;
    const claims = { ...(cuenta.customClaims ?? {}) };
    const antes = JSON.stringify(claims);
    if (puedeGestionarActas) {
      claims.role = "authenticated";
    } else {
      if (claims.role === "authenticated") delete claims.role;
    }
    if (esAdministrador) claims.direccion = true;
    else delete claims.direccion;
    if (puedeGestionarActas) claims.actas = true;
    else delete claims.actas;
    if (JSON.stringify(claims) === antes) continue;
    cambios++;
    if (aplicar) await autenticacion.setCustomUserClaims(cuenta.uid, claims);
  }
} while (pagina);

console.log(`${revisadas} cuentas revisadas; ${gestoresActas} con permiso de actas; ${cambios} cambios ${aplicar ? "aplicados" : "pendientes"}.`);
