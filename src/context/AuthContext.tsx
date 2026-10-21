import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { normalizarRol, type Rol } from "../auth/roles";
import { auth } from "../services/firebase";
import { db } from "../services/firebase";
import { urlApp } from "../utils/rutas";

/** Datos mínimos que necesita la interfaz. Nunca guardamos la contraseña. */
export interface UsuarioSesion {
  id: string;
  email: string;
  nombre: string;
  rol: Rol | null;
  expedienteId?: string;
}

/** Las funciones y datos que cualquier pantalla puede obtener con useAuth(). */
interface ValorAuthContext {
  usuario: UsuarioSesion | null;
  cargando: boolean;
  errorPermiso: string;
  ingresar: (email: string, clave: string, recordar: boolean) => Promise<void>;
  recuperarClave: (email: string) => Promise<void>;
  salir: () => Promise<void>;
}

const CLAVE_SESION_DEMO = "advance-ici-sesion-demo";
const CLAVE_SESION_AUTENTICADA = "advance-ici-sesion-autenticada";

// 1. createContext define qué datos se pueden compartir.
// 2. AuthProvider coloca esos datos alrededor de App en main.tsx.
// 3. useAuth usa useContext para que cada pantalla los lea sin pasar props
//    por todos los componentes intermedios.
const AuthContext = createContext<ValorAuthContext | null>(null);

/** Mantiene una única sesión para toda la aplicación y publica sus cambios. */
export function AuthProvider({ children }: { children: ReactNode }) {
  // usuario=null significa que no hay sesión; cargando evita mostrar el login
  // antes de que Firebase termine de comprobar si ya había una sesión abierta.
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorPermiso, setErrorPermiso] = useState("");

  // Se ejecuta al montar el proveedor. Devuelve la función de desuscripción
  // de Firebase para dejar de escuchar cambios cuando el proveedor se cierre.
  useEffect(() => {
    if (!auth) {
      // En demostración, la sesión dura hasta cerrar la pestaña del navegador.
      const guardado = sessionStorage.getItem(CLAVE_SESION_DEMO);
      if (guardado) {
        try {
          const sesion = JSON.parse(guardado) as UsuarioSesion;
          setUsuario({ ...sesion, rol: "administrador" });
        } catch {
          sessionStorage.removeItem(CLAVE_SESION_DEMO);
        }
      }
      setCargando(false);
      return;
    }

    // El rol se lee de la ficha del UID autenticado, nunca del correo ni del
    // almacenamiento del navegador. Las reglas de Firestore vuelven a comprobarlo.
    let vigente = true;
    let revision = 0;
    const desuscribir = onAuthStateChanged(auth, async (cuenta) => {
      const actual = ++revision;
      if (!cuenta) {
        if (vigente) {
          if (sessionStorage.getItem(CLAVE_SESION_AUTENTICADA) === "true") {
            sessionStorage.removeItem(CLAVE_SESION_AUTENTICADA);
            window.location.replace(urlApp("sesion-expirada"));
            return;
          }
          setUsuario(null);
          setErrorPermiso("");
          setCargando(false);
        }
        return;
      }
      sessionStorage.setItem(CLAVE_SESION_AUTENTICADA, "true");
      setCargando(true);
      setUsuario(null);
      try {
        if (!db) throw new Error("Firestore no está configurado.");
        const ficha = await getDoc(doc(db, "usuarios", cuenta.uid));
        if (!vigente || actual !== revision) return;
        const datosFicha = ficha.data();
        const rol = ficha.exists() && datosFicha?.activo !== false
          ? normalizarRol(datosFicha?.rol)
          : null;
        setUsuario({
          id: cuenta.uid,
          email: cuenta.email ?? "",
          nombre: (typeof datosFicha?.nombre === "string" ? datosFicha.nombre : null) || cuenta.displayName || cuenta.email?.split("@")[0] || "Usuario ICI",
          rol,
          expedienteId: typeof datosFicha?.expedienteId === "string"
            ? datosFicha.expedienteId
            : undefined,
        });
        setErrorPermiso(
          rol
            ? ""
            : datosFicha?.activo === false
              ? "Esta cuenta está desactivada. Contacte al administrador."
              : "Esta cuenta no tiene un rol asignado. Solicite acceso al administrador.",
        );
      } catch {
        if (!vigente || actual !== revision) return;
        setUsuario({
          id: cuenta.uid,
          email: cuenta.email ?? "",
          nombre: cuenta.displayName || cuenta.email?.split("@")[0] || "Usuario ICI",
          rol: null,
        });
        setErrorPermiso("No se pudo verificar el rol de esta cuenta. Intente ingresar nuevamente.");
      } finally {
        if (vigente && actual === revision) setCargando(false);
      }
    });
    return () => {
      vigente = false;
      desuscribir();
    };
  }, []);

  /** El login llama a esta función; Firebase o demo actualizan usuario. */
  async function ingresar(email: string, clave: string, recordar: boolean) {
    if (auth) {
      // Firebase maneja la contraseña. "Recordar" decide si la sesión sobrevive al cierre.
      await setPersistence(
        auth,
        recordar ? browserLocalPersistence : browserSessionPersistence,
      );
      await signInWithEmailAndPassword(auth, email, clave);
      return;
    }

    // Credenciales públicas SOLO para probar la interfaz sin proyecto Firebase.
    if (email !== "demo@advanceici.cl" || clave !== "Demo2026!") {
      throw new Error(
        "Datos incorrectos. Use las credenciales de demostración indicadas.",
      );
    }
    const demo: UsuarioSesion = { id: "administrador-demo", email, nombre: "Administrador ICI", rol: "administrador" };
    sessionStorage.setItem(CLAVE_SESION_DEMO, JSON.stringify(demo));
    setUsuario(demo);
  }

  async function recuperarClave(email: string) {
    if (!auth) {
      throw new Error("La recuperación de contraseña requiere que Firebase esté configurado.");
    }
    await sendPasswordResetEmail(auth, email);
  }

  /** Cierra la sesión y hace que App vuelva a mostrar LoginPage. */
  async function salir() {
    sessionStorage.removeItem(CLAVE_SESION_AUTENTICADA);
    if (auth) await signOut(auth);
    sessionStorage.removeItem(CLAVE_SESION_DEMO);
    setUsuario(null);
    setErrorPermiso("");
  }

  // Cuando cambia usuario, React vuelve a renderizar los consumidores de
  // useAuth(), como App y el formulario de ingreso.
  return (
    <AuthContext.Provider value={{ usuario, cargando, errorPermiso, ingresar, recuperarClave, salir }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Lee el contexto compartido; el error ayuda a detectar páginas fuera de AuthProvider. */
export function useAuth(): ValorAuthContext {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth debe usarse dentro de AuthProvider.");
  return contexto;
}
