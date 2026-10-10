import { describe, expect, it } from "vitest";
import {
  describirCambioAuditable,
  esRutDuplicado,
  validarRut,
} from "../functions/src/domain";

describe("reglas del servidor para expedientes", () => {
  it("valida dígito verificador RUT en el servidor", () => {
    expect(validarRut("12.345.678-5")).toBe(true);
    expect(validarRut("12.345.678-9")).toBe(false);
  });

  it("rechaza RUT duplicado con formatos distintos", () => {
    expect(
      esRutDuplicado("12.345.678-5", [
        { id: "existente", rut: "12345678-5" },
      ]),
    ).toBe(true);
  });

  it("considera el índice del RUT y permite conservar el RUT del expediente actual", () => {
    expect(esRutDuplicado("12345678-5", [], "otro-id")).toBe(true);
    expect(
      esRutDuplicado(
        "12.345.678-5",
        [{ id: "actual", rutNormalizado: "123456785" }],
        "actual",
        "actual",
      ),
    ).toBe(false);
  });

  it("produce auditoría con valores anterior y nuevo, omitiendo campos internos", () => {
    expect(
      describirCambioAuditable(
        { colegiatura: "sin-informar", rut: "11.111.111-1" },
        {
          colegiatura: "al-dia",
          rut: "12.345.678-5",
          rutNormalizado: "123456785",
          historialColegiatura: [],
        },
      ),
    ).toEqual({
      accion: "Cambio de colegiatura",
      detalles: "Campos actualizados: colegiatura, rut",
      valores: {
        colegiatura: { anterior: "sin-informar", nuevo: "al-dia" },
        rut: { anterior: "11.111.111-1", nuevo: "12.345.678-5" },
      },
    });
  });
});
