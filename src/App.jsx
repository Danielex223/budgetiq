import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { ToastContext, useToastProvider } from "./lib/useToast";
import { ToastContainer } from "./components/Toast";

import Landing from "./pages/Landing";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Budgets from "./pages/Budgets";
import Goals from "./pages/Goals";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";

function AppLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0b1120" }}>
      <Navbar />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <Outlet />
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* PUBLIC - LANDING */}
      <Route path="/landing" element={<Landing />} />

      {/* PUBLIC - AUTH */}
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* PROTECTED */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppWithToast() {
  const toast = useToastProvider();

  return (
    <ToastContext.Provider value={toast}>
      <BrowserRouter>
        <AppRoutes />
        <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      </BrowserRouter>
    </ToastContext.Provider>
  );
}

export default AppWithToast;