import { useEffect, useState } from "react";
import { obtenerEstadoSistema } from "../services/sistema";
import type { EstadoSistema } from "../services/sistema";
import { urlApp } from "../utils/rutas";
import { versionAplicacion } from "../utils/version";

export type PublicPageKind =
  | "privacidad"
  | "terminos"
  | "ayuda"
  | "estado"
  | "404"
  | "403"
  | "sesion-expirada";

function PublicFooter() {
  return (
    <footer className="public-footer">
      <span>Advance ICI · Universidad Central de Chile · Versión {versionAplicacion} · Contacto: pendiente de confirmar</span>
      <nav aria-label="Información y soporte">
        <a href={urlApp("privacidad")}>Privacidad</a>
        <a href={urlApp("terminos")}>Términos</a>
        <a href={urlApp("ayuda")}>Ayuda y soporte</a>
      </nav>
    </footer>
  );
}

export function PublicPage({ kind }: { kind: PublicPageKind }) {
  const [estado, setEstado] = useState<EstadoSistema | null>(null);
  const [errorEstado, setErrorEstado] = useState("");

  useEffect(() => {
    if (kind !== "estado") return;
    obtenerEstadoSistema()
      .then(setEstado)
      .catch(() => setErrorEstado("No se pudo consultar el estado del sistema. Intente más tarde."));
  }, [kind]);

  const titulos: Record<PublicPageKind, string> = {
    privacidad: "Política de privacidad",
    terminos: "Términos de uso",
    ayuda: "Ayuda y contacto",
    estado: "Estado del sistema",
    "404": "Página no encontrada",
    "403": "Acceso no autorizado",
    "sesion-expirada": "Su sesión finalizó",
  };

  return (
    <main className="public-page">
      <header className="public-header">
        <a className="public-brand" href={urlApp()} aria-label="Volver a Advance ICI">ADVANCE <strong>ICI</strong></a>
        <a className="button button-secondary" href={urlApp()}>Ir al sistema</a>
      </header>
      <article className="public-content">
        <p className="section-context">Universidad Central de Chile · Advance ICI</p>
        <h1>{titulos[kind]}</h1>
        {kind === "privacidad" && (
          <>
            <p className="draft-notice"><strong>Borrador pendiente de aprobación institucional.</strong> Este texto es informativo y no reemplaza la política oficial de privacidad de la Universidad.</p>
            <h2>Datos tratados</h2>
            <p>El sistema gestiona información asociada a expedientes de titulación, como nombre, RUT, antecedentes académicos, datos de comisión, estado de colegiatura y referencias a actas. También registra la cuenta que realiza cambios y las consultas de expedientes que se abren desde la aplicación.</p>
            <h2>Finalidad y acceso</h2>
            <p>La información se utiliza para apoyar la gestión de titulación de Ingeniería Civil Industrial. El acceso se limita a cuentas autorizadas y los permisos dependen del rol asignado. La auditoría de consultas registra usuario, identificador del expediente, fecha y acción; no duplica nombre ni RUT del expediente.</p>
            <h2>Almacenamiento y conservación</h2>
            <p>En despliegues con Firebase y Supabase configurados, los datos se almacenan en los proyectos habilitados para la aplicación; la institución responsable, ubicación y condiciones de esos servicios deben validarse antes de producción. La versión de demostración utiliza datos de ejemplo y almacenamiento local del navegador. Los plazos de conservación, responsables del tratamiento, transferencias y medidas oficiales deben ser definidos y aprobados por la Universidad antes de publicar esta política como definitiva.</p>
            <h2>Consultas y derechos</h2>
            <p>Para solicitar acceso, rectificación o información sobre el tratamiento, contacte al canal institucional de privacidad, aún pendiente de definición. No envíe datos personales sensibles a través de canales no oficiales.</p>
            <p>Última revisión del borrador: octubre de 2026.</p>
          </>
        )}
        {kind === "terminos" && (
          <>
            <p className="draft-notice"><strong>Borrador pendiente de aprobación institucional.</strong> Estos términos son orientativos y no constituyen condiciones oficiales de la Universidad.</p>
            <h2>Uso autorizado</h2>
            <p>Advance ICI está destinado a apoyar la gestión interna de expedientes de titulación. El acceso es exclusivo para personas autorizadas, quienes deben proteger sus credenciales, cerrar sesión en dispositivos compartidos y consultar únicamente la información necesaria para sus funciones.</p>
            <h2>Responsabilidad sobre la información</h2>
            <p>Las personas usuarias deben registrar información exacta y utilizar las funciones de edición conforme a su rol. Las acciones de consulta y modificación pueden quedar registradas para fines de control y trazabilidad.</p>
            <h2>Disponibilidad</h2>
            <p>El servicio puede estar temporalmente fuera de línea por mantenimiento o problemas técnicos. La versión de demostración no ofrece persistencia ni respaldo de documentos y no debe utilizarse para almacenar información real.</p>
            <p>Las condiciones definitivas, canales de soporte y responsabilidades institucionales están pendientes de validación.</p>
          </>
        )}
        {kind === "ayuda" && (
          <>
            <p>Orientación para el acceso y uso de Advance ICI.</p>
            <div className="help-cards">
              <section><h2>Problemas de acceso</h2><p>Compruebe que usa su cuenta institucional autorizada. Si olvidó su contraseña, use “¿Olvidó su contraseña?” en el inicio de sesión. La recuperación requiere Firebase habilitado.</p></section>
              <section><h2>Permisos pendientes</h2><p>Si su cuenta no tiene un rol asignado, solicite al administrador institucional que revise su acceso. No comparta su contraseña para resolver problemas de permisos.</p></section>
              <section><h2>Soporte institucional</h2><p>El correo de soporte está pendiente de definición por la Universidad. Contacto: <strong>pendiente de confirmar</strong>.</p></section>
              <section><h2>Estado y mantenimiento</h2><p>Consulte <a href={urlApp("estado")}>el estado del sistema</a>. Si aparece una pantalla de mantenimiento, vuelva a intentarlo más tarde.</p></section>
            </div>
          </>
        )}
        {kind === "estado" && (
          errorEstado ? <p className="form-error" role="alert">{errorEstado}</p> : estado === null ? <p role="status">Consultando estado…</p> : estado.mantenimiento ? (
            <>
              <p className="status-indicator status-maintenance">Mantenimiento en curso</p>
              <p>{estado.mensaje || "Estamos realizando tareas de mantenimiento. Vuelva a intentarlo más tarde."}</p>
            </>
          ) : (
            <>
              <p className="status-indicator status-operational">Sistema disponible</p>
              <p>El sistema no está marcado en mantenimiento. La disponibilidad puede depender de los servicios de autenticación y almacenamiento.</p>
            </>
          )
        )}
        {kind === "404" && <><p>No encontramos la dirección solicitada. Puede volver al inicio o consultar la página de ayuda.</p><a href={urlApp("ayuda")}>Ir a ayuda y soporte</a></>}
        {kind === "403" && <><p>Su cuenta no tiene los permisos necesarios para acceder a este contenido. Solicite acceso al administrador institucional.</p><a href={urlApp("ayuda")}>Contactar soporte</a></>}
        {kind === "sesion-expirada" && <><p>Por seguridad, debe volver a iniciar sesión para continuar. Sus cambios no guardados podrían haberse perdido.</p><a href={urlApp()}>Iniciar sesión</a></>}
      </article>
      <PublicFooter />
    </main>
  );
}
