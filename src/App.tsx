
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import Dashboard from "./pages/Dashboard";
import CommentsPage from "./pages/CommentsPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";
import ProfileSetup from "./pages/ProfileSetup";
import Navbar from "./components/Navbar";
import { useEffect } from "react";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Check if profile is incomplete and redirect to setup
  const isProfileIncomplete = !user.program || !user.section || !user.batch;
  const isOnProfileSetup = window.location.pathname === '/profile-setup';
  
  if (isProfileIncomplete && !isOnProfileSetup) {
    return <Navigate to="/profile-setup" replace />;
  }
  
  return <>{children}</>;
};

const RouteTracker = () => {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    // Only save route if user is authenticated and not on login/reset pages
    if (user && !['/login', '/reset-password'].includes(location.pathname)) {
      localStorage.setItem('lastRoute', location.pathname + location.search);
    }
  }, [location, user]);

  return null;
};

const HomeRedirect = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      const savedRoute = localStorage.getItem('lastRoute');
      if (savedRoute && savedRoute !== '/') {
        navigate(savedRoute, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } else if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return null;
};

const AppContent = () => {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-black">
      {user && <Navbar />}
      <RouteTracker />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/comments/:tweetId" element={<ProtectedRoute><CommentsPage /></ProtectedRoute>} />
        <Route path="/profile/:userId?" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="/" element={<HomeRedirect />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
