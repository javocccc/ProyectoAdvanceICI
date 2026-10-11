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
let direcciones = 0;

do {
  const resultado = await autenticacion.listUsers(1000, pagina);
  pagina = resultado.pageToken;
  for (const cuenta of resultado.users) {
    revisadas++;
    const usuario = await firestore.doc(`usuarios/${cuenta.uid}`).get();
    const esDireccion = usuario.data()?.rol === "direccion";
    if (esDireccion) direcciones++;
    const claims = { ...(cuenta.customClaims ?? {}) };
    const antes = JSON.stringify(claims);
    if (esDireccion) {
      claims.role = "authenticated";
      claims.direccion = true;
    } else {
      delete claims.direccion;
    }
    if (JSON.stringify(claims) === antes) continue;
    cambios++;
    if (aplicar) await autenticacion.setCustomUserClaims(cuenta.uid, claims);
  }
} while (pagina);

console.log(`${revisadas} cuentas revisadas; ${direcciones} con rol direccion; ${cambios} cambios ${aplicar ? "aplicados" : "pendientes"}.`);
