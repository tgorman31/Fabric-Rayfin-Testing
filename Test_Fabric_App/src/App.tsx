import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthPage } from "@/components/AuthPage";
import { useAuth } from "@/hooks/AuthContext";
import { useProjectRegisterAccess } from "@/hooks/useProjectRegisterAccess";
import { useProgrammeAdminAccess } from "@/hooks/useProgrammeAdminAccess";
import { AdminPage } from "@/pages/AdminPage";
import { AppLauncherPage } from "@/pages/AppLauncherPage";
import { HomePage } from "@/pages/HomePage";
import { ProjectIndexPage } from "@/pages/ProjectIndexPage";

function AuthGuard({
  children,
  requireAuth,
}: {
  children: React.ReactNode;
  requireAuth: boolean;
}) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) return <Navigate to="/auth" replace />;
  if (!requireAuth && isAuthenticated) return <Navigate to="/" replace />;

  return <>{children}</>;
}

function ProgrammeAdminAccessGuard({ children }: { children: React.ReactNode }) {
  const { loading, hasAccess } = useProgrammeAdminAccess();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!hasAccess) return <Navigate to="/apps" replace />;
  return <>{children}</>;
}

function RegisterAccessGuard({ children }: { children: React.ReactNode }) {
  const { loading, hasAccess } = useProjectRegisterAccess();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/apps" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/auth"
          element={
            <AuthGuard requireAuth={false}>
              <AuthPage />
            </AuthGuard>
          }
        />
        <Route
          path="/"
          element={
            <AuthGuard requireAuth={true}>
              <Navigate to="/project-index" replace />
            </AuthGuard>
          }
        />
        <Route
          path="/apps"
          element={
            <AuthGuard requireAuth={true}>
              <AppLauncherPage />
            </AuthGuard>
          }
        />
        <Route
          path="/project-index"
          element={
            <AuthGuard requireAuth={true}>
              <ProjectIndexPage />
            </AuthGuard>
          }
        />
        <Route
          path="/project-index/:projectGuid"
          element={
            <AuthGuard requireAuth={true}>
              <ProjectIndexPage />
            </AuthGuard>
          }
        />
        <Route
          path="/admin"
          element={
            <AuthGuard requireAuth={true}>
              <ProgrammeAdminAccessGuard>
                <AdminPage />
              </ProgrammeAdminAccessGuard>
            </AuthGuard>
          }
        />
        <Route
          path="/project-register"
          element={
            <AuthGuard requireAuth={true}>
              <RegisterAccessGuard>
                <HomePage />
              </RegisterAccessGuard>
            </AuthGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
