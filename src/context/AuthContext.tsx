import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../services/firebase";

/** Datos mínimos que necesita la interfaz. Nunca guardamos la contraseña. */
export interface UsuarioSesion {
  id: string;
  email: string;
  nombre: string;
}

/** Las funciones y datos que cualquier pantalla puede obtener con useAuth(). */
interface ValorAuthContext {
  usuario: UsuarioSesion | null;
  cargando: boolean;
  ingresar: (email: string, clave: string, recordar: boolean) => Promise<void>;
  salir: () => Promise<void>;
}

const CLAVE_SESION_DEMO = "advance-ici-sesion-demo";

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

  // Se ejecuta al montar el proveedor. Devuelve la función de desuscripción
  // de Firebase para dejar de escuchar cambios cuando el proveedor se cierre.
  useEffect(() => {
    if (!auth) {
      // En demostración, la sesión dura hasta cerrar la pestaña del navegador.
      const guardado = sessionStorage.getItem(CLAVE_SESION_DEMO);
      if (guardado) {
        try {
          setUsuario(JSON.parse(guardado) as UsuarioSesion);
        } catch {
          sessionStorage.removeItem(CLAVE_SESION_DEMO);
        }
      }
      setCargando(false);
      return;
    }

    // Firebase avisa cada vez que cambia la sesión, incluso después de recargar.
    // El permiso para leer fichas lo comprueban las reglas, no este contexto.
    return onAuthStateChanged(auth, (cuenta) => {
      setUsuario(
        cuenta
          ? {
              id: cuenta.uid,
              email: cuenta.email ?? "",
              nombre:
                cuenta.displayName ||
                cuenta.email?.split("@")[0] ||
                "Dirección ICI",
            }
          : null,
      );
      setCargando(false);
    });
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
    const demo = { id: "direccion-demo", email, nombre: "Dirección ICI" };
    sessionStorage.setItem(CLAVE_SESION_DEMO, JSON.stringify(demo));
    setUsuario(demo);
  }

  /** Cierra la sesión y hace que App vuelva a mostrar LoginPage. */
  async function salir() {
    if (auth) await signOut(auth);
    sessionStorage.removeItem(CLAVE_SESION_DEMO);
    setUsuario(null);
  }

  // Cuando cambia usuario, React vuelve a renderizar los consumidores de
  // useAuth(), como App y el formulario de ingreso.
  return (
    <AuthContext.Provider value={{ usuario, cargando, ingresar, salir }}>
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
