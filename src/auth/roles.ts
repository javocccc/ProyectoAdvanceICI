/** Roles stored in usuarios/<uid> de Firestore. */
export type Rol = "administrador" | "coordinador" | "estudiante";

export type Permiso =
  | "leerExpedientes"
  | "editarExpedientes"
  | "cambiarColegiatura"
  | "gestionarActas"
  | "administrarCuentas";

const permisos: Record<Rol, readonly Permiso[]> = {
  administrador: [
    "leerExpedientes",
    "editarExpedientes",
    "cambiarColegiatura",
    "gestionarActas",
    "administrarCuentas",
  ],
  coordinador: ["leerExpedientes", "editarExpedientes", "gestionarActas"],
  estudiante: ["leerExpedientes"],
};

export const nombreRol: Record<Rol, string> = {
  administrador: "Administrador",
  coordinador: "Coordinador",
  estudiante: "Estudiante",
};

export function normalizarRol(valor: unknown): Rol | null {
  if (valor === "administrador" || valor === "direccion") return "administrador";
  if (valor === "coordinador" || valor === "secretaria") return "coordinador";
  if (valor === "estudiante" || valor === "consulta") return "estudiante";
  return null;
}

export function esRol(valor: unknown): valor is Rol {
  return valor === "administrador" || valor === "coordinador" || valor === "estudiante";
}

export function tienePermiso(rol: Rol | null, permiso: Permiso): boolean {
  const normalizado = normalizarRol(rol);
  return normalizado !== null && permisos[normalizado].includes(permiso);
}
