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

// El contexto funciona como una "caja compartida" para login, panel y menú.
const AuthContext = createContext<ValorAuthContext | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargando, setCargando] = useState(true);

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

  async function salir() {
    if (auth) await signOut(auth);
    sessionStorage.removeItem(CLAVE_SESION_DEMO);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, ingresar, salir }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook: cada componente obtiene el usuario sin pasar props por muchas capas. */
export function useAuth(): ValorAuthContext {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth debe usarse dentro de AuthProvider.");
  return contexto;
}
