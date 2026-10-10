import { describe, expect, it } from "vitest";
import { demoExpedientes } from "../src/data/demoExpedientes";
import {
  ErrorAlmacenamientoDemo,
  interpretarDatosDemo,
  mensajeErrorAlmacenamientoDemo,
} from "../src/services/almacenamientoDemo";

describe("almacenamiento local de demostración", () => {
  it("usa los ejemplos iniciales únicamente cuando aún no hay datos guardados", () => {
    expect(interpretarDatosDemo(null)).toBe(demoExpedientes);
  });

  it("no sustituye datos guardados cuyo JSON está dañado", () => {
    let error: unknown;
    try {
      interpretarDatosDemo("{");
    } catch (problema) {
      error = problema;
    }
    expect(error).toBeInstanceOf(ErrorAlmacenamientoDemo);
    expect(mensajeErrorAlmacenamientoDemo(error)).toContain(
      "No se cargarán los ejemplos",
    );
  });

  it.each(["{}", "null", '[{"id":"1","nombre":"Incompleto"}]'])(
    "rechaza estructura local inválida: %s",
    (json) => {
      expect(() => interpretarDatosDemo(json)).toThrow(
        ErrorAlmacenamientoDemo,
      );
    },
  );

  it("acepta registros locales válidos", () => {
    const json = JSON.stringify([demoExpedientes[0]]);
    expect(interpretarDatosDemo(json)).toEqual([demoExpedientes[0]]);
  });
});
