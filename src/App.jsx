import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';

// Pages
import AccountSettings from './pages/AccountSettings';
import AdminDashboard from './pages/AdminDashboard';
import RenterDashboard from './pages/RenterDashboard';
import Paystub from './pages/Paystub';
import TeamCalendar from './pages/TeamCalendar';
import Renters from './pages/Renters';
import Messages from './pages/Messages';
import ServiceTracker from './pages/ServiceTracker';
import Payments from './pages/Payments';
import Expenses from './pages/Expenses';
import MonthlyReports from './pages/MonthlyReports';

const ThemeProvider = ({ children }) => {
  useEffect(() => {
    // Apply saved theme or default to dark
    const savedTheme = localStorage.getItem("1kb-theme") || "dark";
    if (savedTheme === "light") document.documentElement.classList.remove("dark");
    else if (savedTheme === "dark") document.documentElement.classList.add("dark");
    else {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      document.documentElement.classList.toggle("dark", mq.matches);
    }
  }, []);
  return children;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-7 h-7 border-2 border-border border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  const isAdmin = user?.role === 'admin';

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={isAdmin ? <AdminDashboard /> : <RenterDashboard />} />
        <Route path="/renters" element={<Renters />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/services" element={<ServiceTracker />} />
        <Route path="/reports" element={<MonthlyReports />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/calendar" element={<TeamCalendar />} />
        <Route path="/paystub" element={<Paystub />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/account" element={<AccountSettings />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;