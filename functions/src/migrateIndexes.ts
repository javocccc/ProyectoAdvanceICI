import { applicationDefault, initializeApp } from "firebase-admin/app";
import {
  getFirestore,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import {
  generarTokensBusqueda,
  normalizarRut,
} from "./domain";

initializeApp({ credential: applicationDefault() });

const db = getFirestore();
const TAMANO_LECTURA = 400;
const TAMANO_LOTE = 200;

async function migrarIndices(): Promise<void> {
  const coleccion = db.collection("expedientes");
  const vistos = new Map<string, string>();
  let cursor: QueryDocumentSnapshot | undefined;
  let total = 0;
  while (true) {
    let pagina = coleccion
      .orderBy("__name__")
      .select("rut")
      .limit(TAMANO_LECTURA);
    if (cursor) pagina = pagina.startAfter(cursor);
    const resultado = await pagina.get();
    for (const documento of resultado.docs) {
      total += 1;
      const rutGuardado = documento.get("rut");
      if (typeof rutGuardado !== "string") continue;
      const rut = normalizarRut(rutGuardado);
      const anterior = vistos.get(rut);
      if (anterior) {
        throw new Error(
          `RUT duplicado ${rut} en expedientes ${anterior} y ${documento.id}. Corríjalo antes de migrar.`,
        );
      }
      vistos.set(rut, documento.id);
    }
    cursor = resultado.docs.at(-1);
    if (resultado.size < TAMANO_LECTURA) break;
  }

  cursor = undefined;
  let procesados = 0;
  while (true) {
    let pagina = coleccion
      .orderBy("__name__")
      .select("rut", "nombre", "acta")
      .limit(TAMANO_LOTE);
    if (cursor) pagina = pagina.startAfter(cursor);
    const resultado = await pagina.get();
    if (resultado.empty) break;
    const lote = db.batch();
    for (const documento of resultado.docs) {
      const datos = documento.data();
      const expedienteRef = coleccion.doc(documento.id);
      const rut =
        typeof datos.rut === "string" ? normalizarRut(datos.rut) : "";
      const nombre = typeof datos.nombre === "string" ? datos.nombre : "";
      lote.set(
        expedienteRef,
        {
          rutNormalizado: rut,
          busquedaTokens: generarTokensBusqueda(nombre, rut),
          actaPendiente: !datos.acta,
        },
        { merge: true },
      );
      if (rut) {
        lote.set(db.collection("rutIndex").doc(rut), {
          expedienteId: documento.id,
        });
      }
    }
    await lote.commit();
    procesados += resultado.size;
    cursor = resultado.docs.at(-1);
    if (resultado.size < TAMANO_LOTE) break;
  }
  console.log(`Índices preparados para ${procesados} expedientes (${total} revisados).`);
}

void migrarIndices().catch((error: unknown) => {
  console.error("No se pudieron migrar los índices de expedientes.", error);
  process.exitCode = 1;
});
