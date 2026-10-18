// Compara las reglas de Firestore publicadas con firestore.rules sin modificarlas.
// Requiere GOOGLE_APPLICATION_CREDENTIALS de advanceici.
import { readFileSync } from "node:fs";
import { cert } from "firebase-admin/app";

const ruta = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!ruta) throw new Error("Falta GOOGLE_APPLICATION_CREDENTIALS.");
const cuenta = JSON.parse(readFileSync(ruta, "utf8"));
if (cuenta.type !== "service_account" || cuenta.project_id !== "advanceici")
  throw new Error("La cuenta de servicio no pertenece a advanceici.");

const credencial = cert(cuenta);
const { access_token: token } = await credencial.getAccessToken();
const headers = { authorization: `Bearer ${token}` };

async function leerJson(url) {
  const respuesta = await fetch(url, { headers });
  const datos = await respuesta.json();
  if (!respuesta.ok)
    throw new Error(`Firebase Rules API devolvió ${respuesta.status}: ${datos.error?.status ?? "error"}`);
  return datos;
}

try {
  const release = await leerJson("https://firebaserules.googleapis.com/v1/projects/advanceici/releases/cloud.firestore");
  const ruleset = await leerJson(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`);
  const remoto = ruleset.source.files.map((archivo) => archivo.content).join("\n");
  const local = readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");
  const normalizar = (texto) => texto.replace(/\r\n/g, "\n")
    .split("\n").map((linea) => linea.trim()).filter(Boolean).join("\n");
  console.log(`Reglas publicadas: ${release.updateTime}`);
  console.log(`Coinciden con firestore.rules: ${normalizar(remoto) === normalizar(local)}`);
  const rolesActivos = /function\s+esAdministrador\(\)[\s\S]*?administrador/.test(remoto)
    && /function\s+esCoordinador\(\)[\s\S]*?coordinador/.test(remoto)
    && /function\s+esEstudianteVinculado\(id\)[\s\S]*?estudianteUid/.test(remoto)
    && /allow\s+get:\s*if\s+puedeLeerExpediente\(id\)/.test(remoto)
    && /allow\s+list:\s*if\s+puedeLeer\(\)/.test(remoto);
  console.log(`Permisos Administración/Coordinación/Estudiante publicados: ${rolesActivos}`);
  if (process.argv.includes("--show-permissions")) {
    console.log("Permisos publicados:");
    for (const linea of remoto.split(/\r?\n/).filter((valor) => /\ballow\b/.test(valor)))
      console.log(linea.trim());
  }
  if (process.argv.includes("--show-remote")) console.log(remoto);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
