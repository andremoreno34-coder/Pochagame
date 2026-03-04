import React from "react";
import { useDevTools } from "../devToolsContext";

type DevModeToggleProps = {
  compact?: boolean;
};

const DevModeToggle: React.FC<DevModeToggleProps> = ({ compact }) => {
  const { devMode, toggleDevMode } = useDevTools();

  const label = devMode ? "MODO DESARROLLO ON" : "Modo desarrollo OFF";

  return (
    <button
      type="button"
      onClick={toggleDevMode}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: compact ? "4px 8px" : "6px 12px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.2)",
        background: devMode ? "rgba(255, 193, 7, 0.12)" : "transparent",
        color: "#fff",
        fontSize: compact ? 11 : 12,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: devMode ? "#ffc107" : "rgba(255,255,255,0.4)",
        }}
      />
      <span>{label}</span>
    </button>
  );
};

export default DevModeToggle;
