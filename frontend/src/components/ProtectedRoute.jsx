import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-slate-600 font-semibold text-xs uppercase tracking-wider">Syncing Civic Data...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/landing" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    const defaultRedirect = user.role === "admin" ? "/admin" : (user.role === "worker" ? "/worker" : "/");
    return <Navigate to={defaultRedirect} replace />;
  }

  return children;
};
