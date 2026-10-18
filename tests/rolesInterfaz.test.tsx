import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import App from "../src/App";
import type { Rol } from "../src/auth/roles";
import { tienePermiso } from "../src/auth/roles";
import { demoExpedientes } from "../src/data/demoExpedientes";
import { ExpedienteDetallePage } from "../src/pages/ExpedienteDetallePage";

const sesion = vi.hoisted(() => ({ rol: "administrador" as Rol | null }));

describe("límites de roles", () => {
  it("reserva la administración de cuentas y colegiatura a Administración", () => {
    expect(tienePermiso("administrador", "administrarCuentas")).toBe(true);
    expect(tienePermiso("administrador", "cambiarColegiatura")).toBe(true);
    expect(tienePermiso("coordinador", "administrarCuentas")).toBe(false);
    expect(tienePermiso("coordinador", "cambiarColegiatura")).toBe(false);
  });

  it("permite a Coordinación gestionar expedientes y actas, y limita Estudiante a lectura", () => {
    expect(tienePermiso("coordinador", "editarExpedientes")).toBe(true);
    expect(tienePermiso("coordinador", "gestionarActas")).toBe(true);
    expect(tienePermiso("estudiante", "leerExpedientes")).toBe(true);
    expect(tienePermiso("estudiante", "editarExpedientes")).toBe(false);
    expect(tienePermiso("estudiante", "gestionarActas")).toBe(false);
  });
});

vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({
    usuario: { id: "prueba", email: "prueba@example.com", nombre: "Prueba", rol: sesion.rol },
    cargando: false,
    errorPermiso: "Esta cuenta no tiene un rol asignado.",
    salir: async () => {},
  }),
}));

describe("navegación por rol", () => {
  it("muestra la creación de expedientes a Administración y Coordinación", () => {
    for (const rol of ["administrador", "coordinador"] as const) {
      sesion.rol = rol;
      const html = renderToStaticMarkup(<App />);
      expect(html).toContain("Nuevo expediente");
    }
  });

  it("limita Estudiante a su expediente", () => {
    sesion.rol = "estudiante";
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("Expediente pendiente de vinculación");
    expect(html).not.toContain("Panel principal");
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
  it("permite a Coordinación gestionar actas pero reserva colegiatura", () => {
    sesion.rol = "coordinador";
    const htmlCoordinador = renderToStaticMarkup(
      <ExpedienteDetallePage
        expediente={demoExpedientes[0]}
        alVolver={() => {}}
        alEditar={() => {}}
      />,
    );
    expect(htmlCoordinador.match(/Reservado para Administración/g)).toHaveLength(2);
    expect(htmlCoordinador).not.toContain("Reservado para Coordinación y Administración");
    expect(htmlCoordinador).toContain("acta-camila-demo.pdf");
    expect(htmlCoordinador).toContain("Elegir o arrastrar un PDF");
  });

  it("reserva las funciones de gestión a Estudiante", () => {
    for (const rol of ["estudiante"] as const) {
      sesion.rol = rol;
      const html = renderToStaticMarkup(
        <ExpedienteDetallePage
          expediente={demoExpedientes[0]}
          alVolver={() => {}}
          alEditar={() => {}}
        />,
      );
      expect(html).toContain("Reservado para Administración");
      expect(html).toContain("Reservado para Coordinación y Administración");
      expect(html).not.toContain("acta-camila-demo.pdf");
      expect(html).not.toContain("Elegir o arrastrar un PDF");
    }
  });

  it("mantiene disponibles las funciones para Administrador", () => {
    sesion.rol = "administrador";
    const html = renderToStaticMarkup(
      <ExpedienteDetallePage
        expediente={demoExpedientes[0]}
        alVolver={() => {}}
        alEditar={() => {}}
      />,
    );
    expect(html).not.toContain("Reservado para Administración");
    expect(html).toContain("Elegir o arrastrar un PDF");
  });
});
