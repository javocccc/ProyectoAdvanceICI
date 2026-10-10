import { describe, expect, it } from "vitest";
import {
  describirCambioAuditable,
  esRutDuplicado,
  generarTokensBusqueda,
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

  it("genera tokens de búsqueda por prefijo sin tildes y normaliza el RUT", () => {
    const tokens = generarTokensBusqueda("María José Pérez", "12.345.678-5");
    expect(tokens).toContain("maria");
    expect(tokens).toContain("jose");
    expect(tokens).toContain("perez");
    expect(tokens).toContain("123456785");
  });
});
