import { useAuth } from "@/lib/AuthContext";

export default function AdminRoute({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-6 bg-background">
        <div className="max-w-sm text-center space-y-4">
          <p className="font-serif text-2xl">Access Restricted</p>
          <p className="text-sm text-muted-foreground">You don't have permission to view this page.</p>
          <button onClick={() => window.location.href = '/'} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }
  return children;
}