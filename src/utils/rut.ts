/** Quita la puntuación habitual y unifica la K para comparar RUT equivalentes. */
export function limpiarRut(valor: string): string {
  return valor.replace(/[.\s-]/g, "").toUpperCase();
}

/** Recorre el cuerpo de derecha a izquierda con factores de 2 a 7 (módulo 11). */
export function digitoVerificador(cuerpo: string): string {
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i -= 1) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  return resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
}

/** Acepta RUT con o sin puntos o guion, si el dígito verificador coincide. */
export function validarRut(valor: string): boolean {
  const limpio = limpiarRut(valor);
  if (!/^\d{7,8}[\dK]$/.test(limpio)) return false;
  const cuerpo = limpio.slice(0, -1);
  return digitoVerificador(cuerpo) === limpio.slice(-1);
}

/** Normaliza el dato antes de compararlo o guardarlo. */
export function formatearRut(valor: string): string {
  const limpio = limpiarRut(valor);
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
}
