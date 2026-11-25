import { File } from "node:buffer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const simulacion = vi.hoisted(() => ({
  auth: null as null | object,
  opciones: null as Record<string, any> | null,
}));
vi.mock("../src/services/firebase", () => ({ get auth() { return simulacion.auth; }, storage: null }));
vi.mock("../src/services/supabase", () => ({
  bucketActas: "actas",
  endpointSubida: () => "https://storage.example.test/upload",
  exigirSupabase: () => ({}),
  tokenFirebaseParaActas: async () => "token-prueba",
}));
vi.mock("tus-js-client", () => ({
  Upload: class {
    constructor(_archivo: unknown, opciones: Record<string, any>) { simulacion.opciones = opciones; }
    start() { simulacion.opciones!.onSuccess(); }
  },
}));
import { subirActa, validarActa } from "../src/services/actas";

const archivo = (nombre: string, tipo = "") => new File(["contenido de prueba"], nombre, { type: tipo }) as unknown as globalThis.File;

beforeEach(() => { simulacion.auth = null; simulacion.opciones = null; });

describe("actas de cualquier formato", () => {
  it.each(["acta.pdf", "acta.docx", "acta.xlsx", "foto.png", "datos.zip", "archivo.xyz", "sin-extension"])("acepta %s sin exigir MIME ni cabecera PDF", async nombre => {
    expect(await validarActa(archivo(nombre))).toBeNull();
  });
  it("rechaza archivos vacíos y exactamente 10 MB", async () => {
    expect(await validarActa(new File([], "vacio.txt") as unknown as globalThis.File)).toContain("vacío");
    expect(await validarActa({ name: "grande.zip", size: 10 * 1024 * 1024 } as globalThis.File)).toContain("menos de 10 MB");
    expect(await validarActa({ name: "limite.zip", size: 10 * 1024 * 1024 - 1 } as globalThis.File)).toBeNull();
  });
  it.each(["", "   ", "../acta.docx", "carpeta\\acta.txt", "acta\u0000.txt", "a".repeat(201)])("rechaza nombre inválido %s", async nombre => {
    expect(await validarActa({ name: nombre, size: 1 } as globalThis.File)).not.toBeNull();
  });
  it("valida nuevamente al subir y conserva los datos de demo", async () => {
    await expect(subirActa("ficha", new File([], "vacio.txt") as unknown as globalThis.File, vi.fn())).rejects.toThrow("vacío");
    expect((await subirActa("ficha", archivo("acta.docx"), vi.fn())).nombre).toBe("acta.docx");
  });
  it.each([["Acta.DOCX", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".DOCX"], ["sin-extension", "", ""]])("conserva extensión y MIME al subir %s", async (nombre, tipo, extension) => {
    simulacion.auth = {};
    const progreso = vi.fn();
    const acta = await subirActa("ficha", archivo(nombre, tipo), progreso);
    expect(acta.nombre).toBe(nombre);
    expect(acta.ruta).toMatch(new RegExp(`^supabase/ficha/.+${extension.replace(".", "\\.")}$`));
    expect(simulacion.opciones!.metadata.contentType).toBe(tipo || "application/octet-stream");
    expect(progreso).toHaveBeenCalledWith(100);
  });
});
