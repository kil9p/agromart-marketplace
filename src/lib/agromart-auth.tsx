import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "./agromart-types";
import { getSession, login as apiLogin, logout as apiLogout, signup as apiSignup } from "./api";

interface AuthCtx {
  user: User | null;
  isReady: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (input: {
    email: string;
    password: string;
    full_name: string;
    type: "buyer" | "farmer";
  }) => Promise<User>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (s) setUser(s.user);
    setIsReady(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    setUser(res.user);
    return res.user;
  }, []);

  const signup = useCallback(
    async (input: {
      email: string;
      password: string;
      full_name: string;
      type: "buyer" | "farmer";
    }) => {
      const res = await apiSignup(input);
      // auto-login after signup
      const loginRes = await apiLogin(input.email, input.password);
      setUser(loginRes.user);
      return res.user;
    },
    [],
  );

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, isReady, login, signup, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
