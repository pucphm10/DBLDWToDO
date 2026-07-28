import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { Navigate, Route, HashRouter as Router, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthProvider";
import { AppLayout } from "./AppLayout";
import { LoadingScreen } from "../components/ui";
import { isSupabaseConfigured } from "../lib/supabase";
import { ConfigurationPage } from "../pages/ConfigurationPage";

const AuthPage = lazy(() => import("../features/auth/AuthPage").then(m => ({ default: m.AuthPage })));
const ResetPasswordPage = lazy(() => import("../features/auth/AuthPage").then(m => ({ default: m.ResetPasswordPage })));
const UpdatePasswordPage = lazy(() => import("../features/auth/AuthPage").then(m => ({ default: m.UpdatePasswordPage })));
const DashboardPage = lazy(() => import("../pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const ProductionsPage = lazy(() => import("../pages/ProductionsPage").then(m => ({ default: m.ProductionsPage })));
const NewProductionPage = lazy(() => import("../pages/NewProductionPage").then(m => ({ default: m.NewProductionPage })));
const ProductionDetailPage = lazy(() => import("../pages/ProductionDetailPage").then(m => ({ default: m.ProductionDetailPage })));
const TemplatesPage = lazy(() => import("../pages/TemplatesPage").then(m => ({ default: m.TemplatesPage })));
const TemplateDetailPage = lazy(() => import("../pages/TemplateDetailPage").then(m => ({ default: m.TemplateDetailPage })));
const LearningPage = lazy(() => import("../pages/LearningPage").then(m => ({ default: m.LearningPage })));
const SettingsPage = lazy(() => import("../pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage").then(m => ({ default: m.NotFoundPage })));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: false } }
});

function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <AppLayout />;
}

export function App() {
  if (!isSupabaseConfigured) return <ConfigurationPage />;
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/update-password" element={<UpdatePasswordPage />} />
            <Route element={<ProtectedRoute />}>
              <Route index element={<DashboardPage />} />
              <Route path="/productions" element={<ProductionsPage />} />
              <Route path="/productions/new" element={<NewProductionPage />} />
              <Route path="/productions/:id" element={<ProductionDetailPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/templates/:id" element={<TemplateDetailPage />} />
              <Route path="/learning" element={<LearningPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}
