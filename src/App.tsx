import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreProvider, useStore } from "@/lib/store";
import Layout from "@/components/Layout";
import Onboarding from "@/pages/Onboarding";
import HomePage from "@/pages/HomePage";
import MedicationsPage from "@/pages/MedicationsPage";
import LabResultsPage from "@/pages/LabResultsPage";
import NutritionPage from "@/pages/NutritionPage";
import ProfilePage from "@/pages/ProfilePage";
import ProgressPage from "@/pages/ProgressPage";
import JournalPage from "@/pages/JournalPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { profile } = useStore();
  if (!profile) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const { profile } = useStore();

  return (
    <Routes>
      <Route path="/onboarding" element={profile ? <Navigate to="/" replace /> : <Onboarding />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<HomePage />} />
        <Route path="/medications" element={<MedicationsPage />} />
        <Route path="/lab-results" element={<LabResultsPage />} />
        <Route path="/nutrition" element={<NutritionPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/journal" element={<JournalPage />} />
      </Route>
      <Route path="*" element={profile ? <NotFound /> : <Navigate to="/onboarding" replace />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <StoreProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </StoreProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
