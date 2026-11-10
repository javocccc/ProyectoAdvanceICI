import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from "npm:jose@6.2.12";

type Campo = { stringValue?: string; booleanValue?: boolean };
type Documento = {
  name: string;
  updateTime?: string;
  fields?: Record<string, Campo>;
};
type CuentaServicio = { project_id: string; client_email: string; private_key: string };

const clavesFirebase = createRemoteJWKSet(new URL(
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
));
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

class Fallo extends Error {
  constructor(public status: number, mensaje: string) { super(mensaje); }
}

function responder(status: number, datos: Record<string, unknown>): Response {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}

function cuentaServicio(): CuentaServicio {
  const valor = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!valor) throw new Fallo(503, "Falta configurar la credencial Firebase en Supabase.");
  let cuenta: CuentaServicio;
  try { cuenta = JSON.parse(valor) as CuentaServicio; }
  catch { throw new Fallo(503, "La credencial Firebase configurada no es válida."); }
  if (cuenta.project_id !== "advanceici" || !cuenta.client_email || !cuenta.private_key) {
    throw new Fallo(503, "La credencial Firebase no corresponde al proyecto advanceici.");
  }
  return cuenta;
}

async function tokenGoogle(cuenta: CuentaServicio): Promise<string> {
  const clave = await importPKCS8(cuenta.private_key, "RS256");
  const afirmacion = await new SignJWT({ scope: "https://www.googleapis.com/auth/cloud-platform" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(cuenta.client_email)
    .setSubject(cuenta.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(clave);
  const respuesta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: afirmacion,
    }),
  });
  if (!respuesta.ok) throw new Fallo(503, "No se pudo autorizar la credencial de Firebase.");
  const datos = await respuesta.json() as { access_token?: string };
  if (!datos.access_token) throw new Fallo(503, "Firebase no entregó un token de servicio.");
  return datos.access_token;
}

async function google(url: string, acceso: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${acceso}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
}

async function documento(url: string, acceso: string): Promise<Documento | null> {
  const respuesta = await google(url, acceso);
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) throw new Fallo(502, "No se pudo consultar Firestore.");
  return await respuesta.json() as Documento;
}

async function commit(base: string, acceso: string, writes: Record<string, unknown>[]): Promise<void> {
  const respuesta = await google(`${base}:commit`, acceso, {
    method: "POST",
    body: JSON.stringify({ writes }),
  });
  if (!respuesta.ok) throw new Fallo(
    respuesta.status === 409 || respuesta.status === 412 ? 409 : 502,
    "No se pudo preparar la eliminación en Firestore. Actualice la lista e inténtelo otra vez.",
  );
}

Deno.serve(async (solicitud) => {
  if (solicitud.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (solicitud.method !== "POST") return responder(405, { error: "Método no permitido." });
  try {
    const cuenta = cuentaServicio();
    const autorizacion = solicitud.headers.get("Authorization") ?? "";
    if (!autorizacion.startsWith("Bearer ")) throw new Fallo(401, "Debe iniciar sesión.");
    let actorUid: string;
    try {
      const { payload } = await jwtVerify(autorizacion.slice(7), clavesFirebase, {
        issuer: `https://securetoken.google.com/${cuenta.project_id}`,
        audience: cuenta.project_id,
        algorithms: ["RS256"],
      });
      actorUid = payload.sub ?? "";
      if (!actorUid || !/^[A-Za-z0-9_-]{1,128}$/.test(actorUid)) throw new Error("UID inválido");
      const ahora = Math.floor(Date.now() / 1000);
      if (typeof payload.iat !== "number" || payload.iat > ahora
        || typeof payload.auth_time !== "number" || payload.auth_time > ahora) {
        throw new Error("Fechas de sesión inválidas");
      }
    } catch { throw new Fallo(401, "La sesión de Firebase no es válida."); }
    let entrada: unknown;
    try { entrada = await solicitud.json(); }
    catch { throw new Fallo(400, "Envíe una solicitud JSON válida."); }
    const uid = entrada && typeof entrada === "object" && "uid" in entrada ? entrada.uid : undefined;
    if (typeof uid !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(uid)) {
      throw new Fallo(400, "Seleccione una cuenta válida.");
    }
    if (uid === actorUid) throw new Fallo(409, "No puede eliminar su propia cuenta de Administrador.");

    const acceso = await tokenGoogle(cuenta);
    const base = `https://firestore.googleapis.com/v1/projects/${cuenta.project_id}/databases/(default)/documents`;
    const actor = await documento(`${base}/usuarios/${encodeURIComponent(actorUid)}`, acceso);
    if (!actor || actor.fields?.activo?.booleanValue === false || !["administrador", "direccion"].includes(actor.fields?.rol?.stringValue ?? "")) {
      throw new Fallo(403, "Solo un Administrador activo puede eliminar cuentas.");
    }
    const perfil = await documento(`${base}/usuarios/${encodeURIComponent(uid)}`, acceso);
    if (!perfil) throw new Fallo(404, "La cuenta ya no tiene perfil. Actualice la lista.");

    // Primero bloquea el acceso y desliga el expediente. Si falla el borrado de
    // Authentication, el perfil inactivo queda visible para reintentar.
    const writes: Record<string, unknown>[] = [{
      update: { name: perfil.name, fields: { activo: { booleanValue: false } } },
      updateMask: { fieldPaths: ["activo"] },
      ...(perfil.updateTime ? { currentDocument: { updateTime: perfil.updateTime } } : {}),
    }];
    const expedienteId = perfil.fields?.expedienteId?.stringValue;
    if (expedienteId && /^[A-Za-z0-9_-]{1,128}$/.test(expedienteId)) {
      const expediente = await documento(`${base}/expedientes/${encodeURIComponent(expedienteId)}`, acceso);
      if (expediente?.fields?.estudianteUid?.stringValue === uid) {
        writes.push({
          update: { name: expediente.name },
          updateMask: { fieldPaths: ["estudianteUid"] },
          ...(expediente.updateTime ? { currentDocument: { updateTime: expediente.updateTime } } : {}),
        });
      }
    }
    await commit(base, acceso, writes);

    const authRespuesta = await google(
      `https://identitytoolkit.googleapis.com/v1/projects/${cuenta.project_id}/accounts:delete`,
      acceso,
      { method: "POST", body: JSON.stringify({ localId: uid }) },
    );
    if (!authRespuesta.ok) {
      const detalle = await authRespuesta.text();
      if (!detalle.includes("USER_NOT_FOUND")) {
        throw new Fallo(502, "El perfil quedó bloqueado, pero Firebase Authentication no pudo eliminar la cuenta. Reinténtelo.");
      }
    }

    const perfilRespuesta = await google(`${base}/usuarios/${encodeURIComponent(uid)}`, acceso, { method: "DELETE" });
    if (!perfilRespuesta.ok && perfilRespuesta.status !== 404) {
      throw new Fallo(502, "Authentication eliminó la cuenta, pero Firestore no pudo borrar el perfil. Reinténtelo.");
    }
    return responder(200, { eliminado: true });
  } catch (error) {
    if (error instanceof Fallo) return responder(error.status, { error: error.message });
    console.error("eliminar-cuenta: error inesperado", error);
    return responder(500, { error: "No se pudo eliminar la cuenta. Revise los registros de Supabase." });
  }
});
