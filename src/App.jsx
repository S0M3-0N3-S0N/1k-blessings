import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import AccountSettings from './pages/AccountSettings';
import AdminDashboard from './pages/AdminDashboard';
import RenterDashboard from './pages/RenterDashboard';
import MasterLedger from './pages/MasterLedger';
import UserManagement from './pages/UserManagement';
import Paystub from './pages/Paystub';
import TeamCalendar from './pages/TeamCalendar';
import Renters from './pages/Renters';
import Payments from './pages/Payments';

const ThemeProvider = ({ children }) => {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (e) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };
    apply(mq);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return children;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  const isAdmin = user?.role === 'admin';

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={isAdmin ? <AdminDashboard /> : <RenterDashboard />} />
        <Route path="/master-ledger" element={<MasterLedger />} />
        <Route path="/renters" element={<Renters />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/calendar" element={<TeamCalendar />} />
        <Route path="/user-management" element={<UserManagement />} />
        <Route path="/paystub" element={<Paystub />} />
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

export default App