import { describe, expect, it } from "vitest";
import { demoExpedientes } from "../src/data/demoExpedientes";
import { prepararActualizacion } from "../src/utils/cambiosExpediente";

describe("actualización directa de expedientes", () => {
  const actual = demoExpedientes[0];
  const fecha = "2026-10-10T12:00:00.000Z";

  it("guarda estado, observación e historial de auditoría juntos", () => {
    const nuevoEstado = actual.colegiatura === "al-dia" ? "no-al-dia" : "al-dia";
    const cambios = prepararActualizacion(
      actual,
      { colegiatura: nuevoEstado },
      "direccion@ejemplo.cl",
      "Pago verificado",
      fecha,
      "auditoria-1",
    );
    expect(cambios.fechaColegiatura).toBe(fecha);
    expect(cambios.historialColegiatura?.at(-1)).toMatchObject({
      estadoAnterior: actual.colegiatura,
      estadoNuevo: nuevoEstado,
      observacion: "Pago verificado",
    });
    expect(cambios.historialAuditoria?.at(-1)).toMatchObject({
      id: "auditoria-1",
      accion: "Cambio de colegiatura",
      valores: { colegiatura: { anterior: actual.colegiatura, nuevo: nuevoEstado } },
    });
  });

  it("conserva el historial de colegiatura al editar otros datos", () => {
    const cambios = prepararActualizacion(
      actual,
      { nombre: "Nombre corregido" },
      "direccion@ejemplo.cl",
      undefined,
      fecha,
      "auditoria-2",
    );
    expect(cambios.historialColegiatura).toBeUndefined();
    expect(cambios.historialAuditoria?.at(-1)?.accion).toBe("Actualización de expediente");
  });

  it("quita la referencia del acta con null y conserva el resto del expediente", () => {
    const cambios = prepararActualizacion(
      actual,
      { acta: null },
      "direccion@ejemplo.cl",
      undefined,
      fecha,
      "auditoria-3",
    );
    expect(cambios.acta).toBeNull();
    expect(cambios.historialColegiatura).toBeUndefined();
    expect(cambios.historialAuditoria?.at(-1)?.valores?.acta).toEqual({
      anterior: actual.acta ?? null,
      nuevo: null,
    });
  });
});
