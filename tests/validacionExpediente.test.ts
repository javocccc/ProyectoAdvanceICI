import { describe, expect, it } from "vitest";
import {
  validarCamposRegistro,
  type CamposRegistro,
} from "../src/utils/validacionExpediente";

const camposValidos: CamposRegistro = {
  nombre: "Estudiante de Prueba",
  rut: "12.345.678-5",
  anio: "2025",
  semestre: "1",
  fechaExamen: "2025-11-20",
  nota: "6,2",
  guia: "Profesora Guía",
  informante1: "Primer Informante",
  informante2: "Segundo Informante",
  informanteAdicional: "",
};

describe("validarCamposRegistro", () => {
  it("acepta datos completos válidos y notas con coma decimal", () => {
    expect(validarCamposRegistro(camposValidos, 2026)).toEqual({});
  });

  it("rechaza el año actual y años fuera del rango permitido", () => {
    expect(
      validarCamposRegistro({ ...camposValidos, anio: "2026" }, 2026),
    ).toHaveProperty("anio");
    expect(
      validarCamposRegistro({ ...camposValidos, anio: "1999" }, 2026),
    ).toHaveProperty("anio");
  });

  it("rechaza RUT con dígito verificador incorrecto", () => {
    expect(
      validarCamposRegistro({ ...camposValidos, rut: "12.345.678-9" }, 2026),
    ).toHaveProperty("rut");
  });

  it.each(["0,9", "7,1", "texto"])("rechaza nota inválida %s", (nota) => {
    expect(
      validarCamposRegistro({ ...camposValidos, nota }, 2026),
    ).toHaveProperty("nota");
  });

  it("detecta docentes repetidos ignorando tildes, mayúsculas y espacios", () => {
    const errores = validarCamposRegistro(
      {
        ...camposValidos,
        guia: "  María   Pérez ",
        informante1: "maria perez",
      },
      2026,
    );
    expect(errores.guia).toBe("Este docente ya figura en la comisión.");
    expect(errores.informante1).toBe(
      "Este docente ya figura en la comisión.",
    );
  });
});
