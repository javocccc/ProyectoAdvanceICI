/** Los tres estados que Dirección puede registrar manualmente. */
export type EstadoColegiatura = "al-dia" | "no-al-dia" | "sin-informar";

/** Los nombres de la comisión se guardan juntos para evitar campos dispersos. */
export interface Comision {
  guia: string;
  informante1: string;
  informante2: string;
  informanteAdicional?: string;
}

/** Información de un acta PDF. La ruta apunta a Firebase Storage en modo real. */
export interface Acta {
  nombre: string;
  ruta: string;
  fechaCarga: string;
}

/** Un evento permite mostrar quién cambió la colegiatura y cuándo. */
export interface CambioColegiatura {
  estadoAnterior: EstadoColegiatura;
  estadoNuevo: EstadoColegiatura;
  fecha: string;
  usuario: string;
  observacion?: string;
}

/** Contrato común para formulario, panel, ficha y Firebase. */
export interface Expediente {
  id: string;
  nombre: string;
  rut: string;
  anioEgreso: number;
  semestreEgreso: 1 | 2;
  fechaExamen: string;
  notaExamen?: number;
  comision?: Comision;
  colegiatura: EstadoColegiatura;
  fechaColegiatura?: string;
  historialColegiatura: CambioColegiatura[];
  acta?: Acta;
  fechaCreacion: string;
  creadoPor: string;
}

/** Se usa al crear una ficha; el id y las fechas se añaden al guardar. */
export type NuevoExpediente = Omit<
  Expediente,
  "id" | "fechaCreacion" | "creadoPor" | "historialColegiatura"
>;
