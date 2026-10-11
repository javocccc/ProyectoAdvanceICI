// Prueba de integración: usa una cuenta existente de Dirección, sube un PDF
// sintético a Supabase, comprueba lectura/descarga y elimina el archivo.
// Requiere GOOGLE_APPLICATION_CREDENTIALS apuntando fuera del repositorio.
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { createClient } from "@supabase/supabase-js";
import { Upload } from "tus-js-client";

const envText = readFileSync(new URL("../../.env", import.meta.url), "utf8");
function env(nombre) {
  const linea = envText.split(/\r?\n/).filter((valor) => valor.startsWith(`${nombre}=`)).at(-1);
  if (!linea) throw new Error(`Falta ${nombre} en .env`);
  return linea.slice(nombre.length + 1).trim();
}

function pdfVacio() {
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << >> /Contents 4 0 R >>",
    "<< /Length 0 >>\nstream\n\nendstream",
  ];
  let contenido = "%PDF-1.4\n";
  const offsets = [0];
  for (const [indice, objeto] of objetos.entries()) {
    offsets.push(Buffer.byteLength(contenido));
    contenido += `${indice + 1} 0 obj\n${objeto}\nendobj\n`;
  }
  const inicioXref = Buffer.byteLength(contenido);
  contenido += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1))
    contenido += `${String(offset).padStart(10, "0")} 00000 n \n`;
  contenido += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;
  return Buffer.from(contenido);
}

async function idTokenFirebase() {
  const rutaCredencial = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!rutaCredencial) throw new Error("Falta GOOGLE_APPLICATION_CREDENTIALS.");
  const cuentaServicio = JSON.parse(readFileSync(rutaCredencial, "utf8"));
  if (cuentaServicio.type !== "service_account" || cuentaServicio.project_id !== "advanceici")
    throw new Error("La cuenta de servicio no pertenece al proyecto advanceici.");
  initializeApp({ credential: cert(cuentaServicio), projectId: "advanceici" });
  const autenticacion = getAuth();
  let pagina;
  let cuenta;
  do {
    const resultado = await autenticacion.listUsers(1000, pagina);
    cuenta = resultado.users.find((usuario) =>
      usuario.customClaims?.role === "authenticated" &&
      usuario.customClaims?.direccion === true,
    );
    pagina = resultado.pageToken;
  } while (!cuenta && pagina);
  if (!cuenta) throw new Error("No hay cuenta de Dirección con claims configuradas.");
  const tokenPersonalizado = await autenticacion.createCustomToken(cuenta.uid);
  const respuesta = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(env("VITE_FIREBASE_API_KEY"))}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: tokenPersonalizado, returnSecureToken: true }),
    },
  );
  if (!respuesta.ok) throw new Error(`Firebase rechazó el login de prueba (${respuesta.status}).`);
  const datos = await respuesta.json();
  return datos.idToken;
}

function subirConProgreso(archivo, ruta, token, url) {
  const endpoint = new URL(url);
  if (endpoint.hostname.endsWith(".supabase.co"))
    endpoint.hostname = endpoint.hostname.replace(/\.supabase\.co$/, ".storage.supabase.co");
  return new Promise((resolve, reject) => {
    const subida = new Upload(archivo, {
      endpoint: new URL("/storage/v1/upload/resumable", endpoint).toString(),
      retryDelays: [0, 3000, 5000, 10000],
      headers: { authorization: `Bearer ${token}` },
      metadata: { bucketName: "actas", objectName: ruta, contentType: "application/pdf" },
      chunkSize: 6 * 1024 * 1024,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      onSuccess: resolve,
      onError: reject,
    });
    subida.start();
  });
}

async function verificar() {
  const url = env("VITE_SUPABASE_URL");
  const token = await idTokenFirebase();
  const supabase = createClient(url, env("VITE_SUPABASE_PUBLISHABLE_KEY"), {
    accessToken: async () => token,
  });
  const ruta = `prueba-integracion/${randomUUID()}.pdf`;
  const archivo = pdfVacio();
  let subidaCompletada = false;
  try {
    await subirConProgreso(archivo, ruta, token, url);
    subidaCompletada = true;
    console.log("Subida TUS: correcta.");

    const { data: descarga, error: errorDescarga } = await supabase.storage.from("actas").download(ruta);
    if (errorDescarga) throw errorDescarga;
    if (await descarga.text() !== archivo.toString("utf8"))
      throw new Error("El PDF descargado no coincide con el enviado.");
    console.log("Descarga privada: correcta.");

    const visitante = createClient(url, env("VITE_SUPABASE_PUBLISHABLE_KEY"));
    const { error: errorVisitante } = await visitante.storage.from("actas").download(ruta);
    if (!errorVisitante)
      throw new Error("Un visitante sin sesión pudo descargar el PDF privado.");
    console.log("Acceso sin sesión: denegado.");

    const { data: enlace, error: errorEnlace } = await supabase.storage.from("actas").createSignedUrl(ruta, 60);
    if (errorEnlace) throw errorEnlace;
    const respuesta = await fetch(enlace.signedUrl);
    if (!respuesta.ok || await respuesta.text() !== archivo.toString("utf8"))
      throw new Error(`La URL temporal no devolvió el PDF (${respuesta.status}).`);
    console.log("URL temporal: correcta.");
  } finally {
    const { error } = await supabase.storage.from("actas").remove([ruta]);
    if (error) {
      console.error(`No se pudo limpiar la prueba: ${error.message}`);
      process.exitCode = 1;
    } else if (subidaCompletada) {
      console.log("Archivo de prueba eliminado.");
    }
  }
}

try {
  await verificar();
} catch (error) {
  const mensaje = error instanceof Error ? error.message : String(error);
  console.error(`Prueba fallida: ${mensaje.split("\n")[0].slice(0, 300)}`);
  process.exitCode = 1;
}
