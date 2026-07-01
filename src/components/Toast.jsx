import T from "../lib/theme";
import { useEffect, useState } from "react";

export default function Toast({ id, message, type = "info", duration = 4000, onClose }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const getStyles = () => {
    const baseStyle = {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      padding: "12px 16px",
      borderRadius: "8px",
      fontSize: "13px",
      fontWeight: "500",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      maxWidth: "320px",
      wordWrap: "break-word",
      zIndex: 10000,
      animation: isExiting ? "slideOut 0.3s ease forwards" : "slideIn 0.3s ease forwards",
      boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
      fontFamily: "sans-serif",
    };

    const typeStyles = {
      success: {
        background: T.color.income,
        color: T.color.white,
        icon: "✓",
      },
      error: {
        background: T.color.expense,
        color: T.color.white,
        icon: "✕",
      },
      info: {
        background: T.brand.primary,
        color: T.color.white,
        icon: "ℹ",
      },
      warning: {
        background: T.color.warning,
        color: T.color.white,
        icon: "⚠",
      },
    };

    const current = typeStyles[type] || typeStyles.info;
    return { ...baseStyle, background: current.background, color: current.color, icon: current.icon };
  };

  const styles = getStyles();
  const { icon, ...toastStyle } = styles;

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(400px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideOut {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(400px);
          }
        }
      `}</style>
      <div style={toastStyle}>
        <span style={{ fontSize: "16px", flexShrink: 0 }}>{icon}</span>
        <span>{message}</span>
      </div>
    </>
  );
}

export function ToastContainer({ toasts, removeToast }) {
  return (
    <div style={{ position: "fixed", bottom: 0, right: 0, zIndex: 9999 }}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={removeToast}
        />
      ))}
    </div>
  );
}