import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import App from "../src/App";
import type { Rol } from "../src/auth/roles";
import { demoExpedientes } from "../src/data/demoExpedientes";
import { ExpedienteDetallePage } from "../src/pages/ExpedienteDetallePage";

const sesion = vi.hoisted(() => ({ rol: "direccion" as Rol | null }));

vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({
    usuario: { id: "prueba", email: "prueba@example.com", nombre: "Prueba", rol: sesion.rol },
    cargando: false,
    errorPermiso: "Esta cuenta no tiene un rol asignado.",
    salir: async () => {},
  }),
}));

describe("navegación por rol", () => {
  it("muestra la creación de expedientes a Dirección y Secretaría", () => {
    for (const rol of ["direccion", "secretaria"] as const) {
      sesion.rol = rol;
      const html = renderToStaticMarkup(<App />);
      expect(html).toContain("Nuevo expediente");
    }
  });

  it("oculta la creación a Consulta", () => {
    sesion.rol = "consulta";
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("Panel principal");
    expect(html).not.toContain("Nuevo expediente");
  });

  it("rechaza una sesión sin rol válido", () => {
    sesion.rol = null;
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("Acceso pendiente");
    expect(html).not.toContain("Panel principal");
  });
});

describe("ficha por rol", () => {
  it("reserva colegiatura, historial y acta para Dirección", () => {
    for (const rol of ["secretaria", "consulta"] as const) {
      sesion.rol = rol;
      const html = renderToStaticMarkup(
        <ExpedienteDetallePage
          expediente={demoExpedientes[0]}
          alVolver={() => {}}
          alEditar={() => {}}
        />,
      );
      expect(html.match(/Reservado para el rol Dirección/g)).toHaveLength(3);
      expect(html).not.toContain("acta-camila-demo.pdf");
      expect(html).not.toContain("Elegir o arrastrar un PDF");
    }
  });

  it("mantiene disponibles las funciones para Dirección", () => {
    sesion.rol = "direccion";
    const html = renderToStaticMarkup(
      <ExpedienteDetallePage
        expediente={demoExpedientes[0]}
        alVolver={() => {}}
        alEditar={() => {}}
      />,
    );
    expect(html).not.toContain("Reservado para el rol Dirección");
    expect(html).toContain("Elegir o arrastrar un PDF");
  });
});
