import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export const DEV_EMAIL = "andremorenoc.ai@gmail.com";

type DevToolsContextValue = {
  devMode: boolean;
  canUseDevMode: boolean;
  setDevMode: (value: boolean) => void;
  toggleDevMode: () => void;
};

const DevToolsContext = createContext<DevToolsContextValue | undefined>(
  undefined,
);

export const DevToolsProvider = ({
  children,
  userEmail,
  initialDevMode = false,
  onDevModeChange,
}: {
  children: ReactNode;
  userEmail?: string;
  initialDevMode?: boolean;
  onDevModeChange?: (value: boolean) => void;
}) => {
  const canUseDevMode = userEmail === DEV_EMAIL;
  const [devMode, setDevModeState] = useState(false);

  useEffect(() => {
    if (!canUseDevMode) {
      setDevModeState(false);
      return;
    }
    setDevModeState(initialDevMode);
  }, [canUseDevMode, initialDevMode]);

  const setDevMode = (value: boolean) => {
    if (!canUseDevMode) return;
    setDevModeState(value);
    onDevModeChange?.(value);

    if (userEmail) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      fetch(`${supabaseUrl}/functions/v1/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseAnonKey}`,
          "Apikey": supabaseAnonKey,
        },
        body: JSON.stringify({ email: userEmail, dev_mode: value }),
      }).then(() => {});
    }
  };

  const toggleDevMode = () => setDevMode(!devMode);

  return (
    <DevToolsContext.Provider
      value={{ devMode, canUseDevMode, setDevMode, toggleDevMode }}
    >
      {children}
    </DevToolsContext.Provider>
  );
};

export const useDevTools = () => {
  const ctx = useContext(DevToolsContext);
  if (!ctx) {
    throw new Error("useDevTools must be used inside DevToolsProvider");
  }
  return ctx;
};

export const DevOnly = ({ children }: { children: ReactNode }) => {
  const { devMode, canUseDevMode } = useDevTools();
  if (!canUseDevMode || !devMode) return null;
  return <>{children}</>;
};
