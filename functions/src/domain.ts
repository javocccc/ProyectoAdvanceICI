export interface ExpedienteRut {
  id: string;
  rut?: unknown;
  rutNormalizado?: unknown;
}

export interface AuditoriaCambio {
  accion: string;
  detalles: string;
  valores: Record<string, { anterior: unknown; nuevo: unknown }>;
}

const CAMPOS_AUDITABLES = new Set([
  "nombre",
  "rut",
  "anioEgreso",
  "semestreEgreso",
  "fechaExamen",
  "notaExamen",
  "comision",
  "colegiatura",
  "acta",
]);

export function normalizarRut(rut: string): string {
  return rut.replace(/[.\-\s]/g, "").toUpperCase();
}

export function validarRut(rut: string): boolean {
  const limpio = normalizarRut(rut);
  if (!/^\d{7,8}[\dK]$/.test(limpio)) return false;
  const cuerpo = limpio.slice(0, -1);
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i -= 1) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  const verificador =
    resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return verificador === limpio.slice(-1);
}

/** Comprueba duplicados considerando el índice y registros antiguos sin índice. */
export function esRutDuplicado(
  rut: string,
  expedientes: ExpedienteRut[],
  propietarioIndice?: string,
  excluirId?: string,
): boolean {
  if (propietarioIndice && propietarioIndice !== excluirId) return true;
  const normalizado = normalizarRut(rut);
  return expedientes.some((expediente) => {
    if (expediente.id === excluirId) return false;
    const guardado = expediente.rutNormalizado ?? expediente.rut;
    return (
      typeof guardado === "string" &&
      normalizarRut(guardado) === normalizado
    );
  });
}

/** Construye el resumen auditable a partir de los valores confirmados en servidor. */
export function describirCambioAuditable(
  anterior: Record<string, unknown>,
  cambios: Record<string, unknown>,
): AuditoriaCambio {
  const valores = Object.fromEntries(
    Object.keys(cambios)
      .filter((campo) => CAMPOS_AUDITABLES.has(campo))
      .map((campo) => [
        campo,
        {
          anterior: anterior[campo] ?? null,
          nuevo: cambios[campo] ?? null,
        },
      ]),
  );
  const campos = Object.keys(valores);
  return {
    accion: valores.colegiatura
      ? "Cambio de colegiatura"
      : "Actualización de expediente",
    detalles: `Campos actualizados: ${campos.join(", ")}`,
    valores,
  };
}
