/** Los tres estados que Dirección puede registrar manualmente. */
export type EstadoColegiatura = "al-dia" | "no-al-dia" | "sin-informar";

export interface Acta {
  nombre: string;
  ruta: string;
  fechaCarga: string;
}

export interface RegistroAuditoria {
  id: string;
  fecha: string;
  usuario: string;
  accion: string;
  detalles: string;
}

/** Los nombres de la comisión se guardan juntos para evitar campos dispersos. */
export interface Comision {
  guia: string;
  informante1: string;
  informante2: string;
  informanteAdicional?: string;
}

export interface CambioColegiatura {
  estadoAnterior?: EstadoColegiatura;
  estadoNuevo: EstadoColegiatura;
  fecha: string;
  usuario: string;
  observacion?: string;
}

export interface NuevoExpediente {
  nombre: string;
  rut: string;
  anioEgreso: number;
  semestreEgreso: number;
  fechaExamen: string;
  notaExamen?: number;
  comision?: Comision;
  colegiatura: EstadoColegiatura;
  fechaColegiatura?: string;
}

export interface Expediente extends NuevoExpediente {
  id: string;
  fechaCreacion: string;
  creadoPor: string;
  historialColegiatura: CambioColegiatura[];
  acta?: Acta;
  historialAuditoria?: RegistroAuditoria[];
}

/** Omit quita los campos que crea el servicio, para que el formulario no deba pedirlos. */
export type DatosEditablesExpediente = Omit<
  NuevoExpediente,
  "colegiatura" | "fechaColegiatura"
>;
