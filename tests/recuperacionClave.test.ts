import { beforeEach, describe, expect, it, vi } from "vitest";

const simulacion = vi.hoisted(() => ({ auth: { languageCode: "" } as { languageCode: string } | null, enviar: vi.fn() }));
vi.mock("firebase/auth", () => ({ sendPasswordResetEmail: simulacion.enviar }));
vi.mock("../src/services/firebase", () => ({ get auth() { return simulacion.auth; } }));
import { recuperarClave } from "../src/services/recuperacionClave";

beforeEach(() => { simulacion.auth = { languageCode: "" }; simulacion.enviar.mockReset(); });

describe("recuperación de contraseña", () => {
  it("solicita el correo a Firebase en español y sin espacios exteriores", async () => {
    await recuperarClave("  persona@example.com  ");
    expect(simulacion.auth!.languageCode).toBe("es");
    expect(simulacion.enviar).toHaveBeenCalledExactlyOnceWith(simulacion.auth, "persona@example.com");
  });
  it.each(["", "persona", "sin@dominio", "a b@example.com", "a@b@c.cl", "a".repeat(250) + "@example.com"])("rechaza correo inválido %s antes de llamar al proveedor", async correo => {
    await expect(recuperarClave(correo)).rejects.toMatchObject({ code: "auth/invalid-email" });
    expect(simulacion.enviar).not.toHaveBeenCalled();
  });
  it("no simula un envío cuando Firebase no está configurado", async () => {
    simulacion.auth = null;
    await expect(recuperarClave("persona@example.com")).rejects.toThrow("Firebase");
    expect(simulacion.enviar).not.toHaveBeenCalled();
  });
  it("mantiene la misma respuesta para un correo sin cuenta", async () => {
    simulacion.enviar.mockRejectedValue({ code: "auth/user-not-found" });
    await expect(recuperarClave("persona@example.com")).resolves.toBeUndefined();
  });
  it.each(["auth/network-request-failed", "auth/too-many-requests", "auth/operation-not-allowed"])("propaga %s para informar el fallo", async code => {
    simulacion.enviar.mockRejectedValue({ code });
    await expect(recuperarClave("persona@example.com")).rejects.toMatchObject({ code });
  });
});
