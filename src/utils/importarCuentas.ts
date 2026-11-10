import type { CuentaApp } from "../services/cuentas";
import type { Expediente } from "../types/expediente";
import { digitoVerificador, limpiarRut } from "./rut";

export interface FilaCuenta {
  linea: number;
  nombre: string;
  email: string;
  rut: string;
  expedienteId: string;
  expedienteNombre: string;
  errores: string[];
}

export const ENCABEZADO_CUENTAS = "nombre,email,rut";
export const MAX_FILAS_CUENTAS = 200;
export const MAX_BYTES_CUENTAS = 1024 * 1024;

function leerCsv(texto: string, separador: string): { linea: number; campos: string[] }[] {
  const filas: { linea: number; campos: string[] }[] = [];
  let campos: string[] = [];
  let campo = "";
  let entreComillas = false;
  let linea = 1;
  let inicio = 1;
  for (let indice = 0; indice < texto.length; indice += 1) {
    const caracter = texto[indice];
    if (caracter === '"') {
      if (entreComillas && texto[indice + 1] === '"') {
        campo += '"';
        indice += 1;
      } else if (entreComillas || !campo) {
        entreComillas = !entreComillas;
      } else {
        throw new Error(`Comillas fuera de lugar en la línea ${linea}.`);
      }
    } else if (caracter === separador && !entreComillas) {
      campos.push(campo.trim());
      campo = "";
    } else if ((caracter === "\n" || caracter === "\r") && !entreComillas) {
      campos.push(campo.trim());
      if (campos.some(Boolean)) filas.push({ linea: inicio, campos });
      campos = [];
      campo = "";
      if (caracter === "\r" && texto[indice + 1] === "\n") indice += 1;
      linea += 1;
      inicio = linea;
    } else {
      campo += caracter;
      if (caracter === "\n") linea += 1;
    }
  }
  if (entreComillas) throw new Error("El archivo termina con comillas sin cerrar.");
  campos.push(campo.trim());
  if (campos.some(Boolean)) filas.push({ linea: inicio, campos });
  return filas;
}

export function interpretarCuentasCsv(
  textoOriginal: string,
  cuentas: CuentaApp[],
  expedientes: Expediente[],
): FilaCuenta[] {
  const texto = textoOriginal.replace(/^\uFEFF/, "");
  if (texto.includes("\uFFFD")) throw new Error("El archivo contiene caracteres ilegibles. Guárdelo como CSV UTF-8 desde Excel.");
  const primeraLinea = texto.split(/\r?\n/, 1)[0];
  const separador = primeraLinea.includes(";") && !primeraLinea.includes(",") ? ";" : ",";
  const filas = leerCsv(texto, separador);
  if (!filas.length) throw new Error("El archivo está vacío.");
  if (filas[0].campos.map((campo) => campo.toLowerCase()).join(",") !== ENCABEZADO_CUENTAS) {
    throw new Error(`La primera fila debe ser: ${ENCABEZADO_CUENTAS}`);
  }
  if (filas.length < 2) throw new Error("Agregue al menos una cuenta bajo los encabezados.");
  if (filas.length - 1 > MAX_FILAS_CUENTAS) throw new Error(`Se permiten hasta ${MAX_FILAS_CUENTAS} cuentas por archivo.`);

  const correosExistentes = new Set(cuentas.map((cuenta) => cuenta.email.trim().toLowerCase()));
  const correosArchivo = new Set<string>();
  const expedientesArchivo = new Set<string>();
  const expedientesPorRut = new Map(expedientes.map((expediente) => [limpiarRut(expediente.rut), expediente]));

  return filas.slice(1).map(({ linea, campos }) => {
    const [nombre = "", correo = "", rut = ""] = campos;
    const email = correo.toLowerCase();
    const rutNormalizado = limpiarRut(rut);
    const expediente = rutNormalizado ? expedientesPorRut.get(rutNormalizado) : undefined;
    const expedienteId = expediente?.id ?? "";
    const errores: string[] = [];
    if (campos.length !== 3) errores.push("Use exactamente tres columnas.");
    if (!nombre || nombre.length > 120) errores.push("El nombre debe tener entre 1 y 120 caracteres.");
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errores.push("Correo no válido.");
    if (correosExistentes.has(email)) errores.push("El correo ya tiene una cuenta.");
    if (correosArchivo.has(email)) errores.push("Correo repetido en el archivo.");
    if (email) correosArchivo.add(email);
    if (rutNormalizado) {
      const cuerpo = rutNormalizado.slice(0, -1);
      if (!/^\d{7,8}[\dK]$/.test(rutNormalizado) || digitoVerificador(cuerpo) !== rutNormalizado.slice(-1)) {
        errores.push("RUT no válido.");
      } else if (!expediente) errores.push("No hay expediente con ese RUT.");
      else if (expediente.estudianteUid) errores.push("El expediente ya está vinculado.");
      if (expedientesArchivo.has(rutNormalizado)) errores.push("RUT repetido en el archivo.");
      expedientesArchivo.add(rutNormalizado);
    }
    return { linea, nombre, email, rut, expedienteId, expedienteNombre: expediente?.nombre ?? "", errores };
  });
}
