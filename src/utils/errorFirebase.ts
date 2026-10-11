/** Mensajes accionables para fallos de Firebase sin ocultar la causa real. */
export function mensajeErrorFirebase(error: unknown, accion: "guardar" | "auditoria" | "acta" | "abrirActa" | "descargarActa" | "listado"): string {
  const codigo = typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "";
  const estado = typeof error === "object" && error !== null && "statusCode" in error
    ? String(error.statusCode)
    : "";
  if (estado === "401" || estado === "403") {
    return "Supabase rechazó el acceso al PDF. Compruebe la integración Firebase Auth, las claims role/direccion y las políticas del bucket actas.";
  }
  if (estado === "404") {
    return "No se encontró el PDF o el bucket privado actas en Supabase.";
  }
  if (codigo.endsWith("/permission-denied") || codigo === "permission-denied" || codigo === "storage/unauthorized") {
    if (accion === "auditoria") {
      return "No hay permiso para leer la auditoría. Compruebe que las reglas de expedientes/{id}/auditoria estén publicadas y que la cuenta tenga el rol direccion.";
    }
    return "La cuenta no tiene permiso. Compruebe el rol direccion y las reglas publicadas en Firebase.";
  }
  if (codigo === "functions/internal") {
    return "La función de guardado devolvió un error interno. Compruebe que esté desplegada en us-central1 y revise sus registros en Firebase.";
  }
  if (codigo === "functions/not-found") {
    return "La función para guardar no está desplegada en us-central1. Publique Cloud Functions en un proyecto Blaze.";
  }
  if (codigo === "functions/unauthenticated") {
    return "La sesión venció. Vuelva a iniciar sesión e inténtelo otra vez.";
  }
  if (codigo === "failed-precondition" || codigo === "firestore/failed-precondition") {
    return "Falta un índice de Firestore. Publique los índices del proyecto y espere a que estén listos.";
  }
  if (codigo === "storage/bucket-not-found" || codigo === "storage/project-not-found") {
    return "No se encontró el bucket de Storage. Revise VITE_FIREBASE_STORAGE_BUCKET y el proyecto Firebase.";
  }
  if (codigo === "storage/quota-exceeded") {
    return "Storage alcanzó su cuota. Revise la facturación y el uso del proyecto Firebase.";
  }
  if (codigo === "storage/retry-limit-exceeded") {
    return "Storage no respondió. Compruebe la conexión, el bucket y que el proyecto tenga el plan Blaze.";
  }
  if (codigo === "functions/unavailable" || codigo === "unavailable") {
    return "Firebase no está disponible ahora. Compruebe la conexión y vuelva a intentarlo.";
  }
  const prefijo = accion === "guardar"
    ? "No se pudo guardar el estado"
    : accion === "auditoria"
      ? "No se pudo cargar el historial de auditoría"
      : accion === "acta"
        ? "No se pudo subir el acta"
        : accion === "abrirActa"
          ? "No se pudo abrir el acta"
          : accion === "descargarActa"
            ? "No se pudo descargar el acta"
        : "No fue posible cargar los expedientes";
  const detalle = error instanceof Error ? error.message : "Error desconocido";
  return `${prefijo}: ${detalle}`;
}
