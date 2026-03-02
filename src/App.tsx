import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreProvider, useStore } from "@/lib/store";
import { useMedNotifications } from "@/hooks/use-med-notifications";
import { LanguageProvider } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import Layout from "@/components/Layout";
import AuthPage from "@/pages/AuthPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import Onboarding from "@/pages/Onboarding";
import HomePage from "@/pages/HomePage";
import MedicationsPage from "@/pages/MedicationsPage";
import LabResultsPage from "@/pages/LabResultsPage";
import NutritionPage from "@/pages/NutritionPage";
import ProfilePage from "@/pages/ProfilePage";
import ProgressPage from "@/pages/ProgressPage";
import JournalPage from "@/pages/JournalPage";
import SettingsPage from "@/pages/SettingsPage";
import ReportPage from "@/pages/ReportPage";
import MealPlanPage from "@/pages/MealPlanPage";
import AssistantPage from "@/pages/AssistantPage";
import NotFound from "@/pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { profile, loading } = useStore();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );
  if (!profile) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: storeLoading } = useStore();
  useMedNotifications();

  if (authLoading || (user && storeLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/onboarding" element={
        <AuthGuard>
          {profile ? <Navigate to="/" replace /> : <Onboarding />}
        </AuthGuard>
      } />
      <Route element={<AuthGuard><ProtectedRoute><Layout /></ProtectedRoute></AuthGuard>}>
        <Route path="/" element={<HomePage />} />
        <Route path="/medications" element={<MedicationsPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/lab-results" element={<LabResultsPage />} />
        <Route path="/nutrition" element={<NutritionPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/journal" element={<JournalPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/meal-plan" element={<MealPlanPage />} />
      </Route>
      <Route path="*" element={user ? (profile ? <NotFound /> : <Navigate to="/onboarding" replace />) : <Navigate to="/auth" replace />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <LanguageProvider>
        <AuthProvider>
          <StoreProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </StoreProvider>
        </AuthProvider>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
