import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout.jsx';

import AdminDashboard from './pages/AdminDashboard.jsx';
import RenterDashboard from './pages/RenterDashboard.jsx';
import Paystub from './pages/Paystub.jsx';
import TeamCalendar from './pages/TeamCalendar.jsx';
import Renters from './pages/Renters.jsx';
import Messages from './pages/Messages.jsx';
import ServiceTracker from './pages/ServiceTracker.jsx';
import Payments from './pages/Payments.jsx';
import Expenses from './pages/Expenses.jsx';
import MonthlyReports from './pages/MonthlyReports.jsx';
import AccountSettings from './pages/AccountSettings.jsx';

const ThemeProvider = ({ children }) => {
  useEffect(() => {
    const savedTheme = localStorage.getItem("1kb-theme") || "dark";
    if (savedTheme === "light") document.documentElement.classList.remove("dark");
    else document.documentElement.classList.add("dark");
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