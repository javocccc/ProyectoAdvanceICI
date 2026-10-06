/** Los tres estados que Dirección puede registrar manualmente. */
export type EstadoColegiatura = "al-dia" | "no-al-dia" | "sin-informar";

/** Los nombres de la comisión se guardan juntos para evitar campos dispersos. */
export interface Comision {
  guia: string;
  informante1: string;
  informante2: string;
  informanteAdicional?: string;
}

/** Datos descriptivos de un PDF. "ruta" apunta a Storage o a un marcador demo/; no contiene el archivo. */
export interface Acta {
  nombre: string; // Nombre original que verá la persona al descargar.
  ruta: string; // Ubicación del PDF en Storage; en demo comienza con "demo/".
  fechaCarga: string; // Fecha y hora ISO de la carga.
}

/** Un evento permite mostrar quién cambió la colegiatura y cuándo. */
export interface CambioColegiatura {
  estadoAnterior: EstadoColegiatura;
  estadoNuevo: EstadoColegiatura;
  fecha: string;
  usuario: string;
  observacion?: string;
}

/** Datos compartidos por las pantallas y el servicio. Las fechas son texto ISO; la nota y la comisión son opcionales. */
export interface Expediente {
  id: string; // También es el identificador del documento en Firestore.
  nombre: string;
  rut: string;
  anioEgreso: number;
  semestreEgreso: 1 | 2;
  fechaExamen: string; // Fecha del formulario: AAAA-MM-DD.
  notaExamen?: number; // Puede faltar en fichas creadas con el formulario anterior.
  comision?: Comision; // Puede faltar en fichas creadas con el formulario anterior.
  colegiatura: EstadoColegiatura;
  fechaColegiatura?: string; // Fecha y hora ISO del último cambio.
  historialColegiatura: CambioColegiatura[];
  acta?: Acta;
  fechaCreacion: string; // Fecha y hora ISO que agrega el servicio al crear.
  creadoPor: string; // Correo de la persona que creó la ficha.
}

/** Omit quita los campos que crea el servicio, para que el formulario no deba pedirlos. */
export type NuevoExpediente = Omit<
  Expediente,
  "id" | "fechaCreacion" | "creadoPor" | "historialColegiatura"
>;
