import type { Expediente, RegistroAuditoria } from "../types/expediente";

const CAMPOS_AUDITABLES = new Set([
  "nombre", "rut", "anioEgreso", "semestreEgreso", "fechaExamen",
  "notaExamen", "comision", "colegiatura", "acta",
]);

/** Prepara el cambio y agrega su historial sin perder cambios concurrentes. */
export function prepararActualizacion(
  actual: Expediente,
  cambios: Partial<Expediente>,
  usuario: string,
  observacionColegiatura?: string,
  fecha = new Date().toISOString(),
  auditoriaId = crypto.randomUUID(),
): Partial<Expediente> {
  const preparados: Partial<Expediente> = { ...cambios };
  if (preparados.colegiatura && preparados.colegiatura !== actual.colegiatura) {
    preparados.fechaColegiatura = fecha;
    preparados.historialColegiatura = [
      ...(actual.historialColegiatura ?? []),
      {
        estadoAnterior: actual.colegiatura,
        estadoNuevo: preparados.colegiatura,
        fecha,
        usuario,
        ...(observacionColegiatura?.trim()
          ? { observacion: observacionColegiatura.trim() }
          : {}),
      },
    ];
  }
  const valores = Object.fromEntries(
    Object.entries(cambios)
      .filter(([campo]) => CAMPOS_AUDITABLES.has(campo))
      .map(([campo, nuevo]) => [campo, {
        anterior: actual[campo as keyof Expediente] ?? null,
        nuevo: nuevo ?? null,
      }]),
  );
  const campos = Object.keys(valores);
  const registro: RegistroAuditoria = {
    id: auditoriaId,
    fecha,
    usuario,
    accion: cambios.colegiatura && cambios.colegiatura !== actual.colegiatura
      ? "Cambio de colegiatura"
      : "Actualización de expediente",
    detalles: `Campos actualizados: ${campos.join(", ")}`,
    valores,
  };
  preparados.historialAuditoria = [...(actual.historialAuditoria ?? []), registro];
  return preparados;
}
