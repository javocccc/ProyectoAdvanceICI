/** Roles guardados por un administrador en usuarios/<uid> de Firestore. */
export type Rol = "direccion" | "secretaria" | "consulta";

export type Permiso =
  | "leerExpedientes"
  | "editarExpedientes"
  | "cambiarColegiatura"
  | "gestionarActas";

const permisos: Record<Rol, readonly Permiso[]> = {
  direccion: [
    "leerExpedientes",
    "editarExpedientes",
    "cambiarColegiatura",
    "gestionarActas",
  ],
  secretaria: ["leerExpedientes", "editarExpedientes"],
  consulta: ["leerExpedientes"],
};

export const nombreRol: Record<Rol, string> = {
  direccion: "Dirección ICI",
  secretaria: "Secretaría ICI",
  consulta: "Consulta ICI",
};

export function esRol(valor: unknown): valor is Rol {
  return valor === "direccion" || valor === "secretaria" || valor === "consulta";
}

export function tienePermiso(rol: Rol | null, permiso: Permiso): boolean {
  return rol !== null && permisos[rol].includes(permiso);
}
