import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useEffect } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Search from './pages/Search';
import Library from './pages/Library';
import PlayTogether from './pages/PlayTogether';
import Settings from './pages/Settings';
import { useAuthStore } from './stores/useAuthStore';
import AuthPage from './pages/Auth/AuthPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function App() {
  const { initializeAuth } = useAuthStore();

  // Initialize auth on app start
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const router = createBrowserRouter(
    [
      {
        path: '/',
        element: <ProtectedLayout />,
        children: [
          { index: true, element: <Home /> },
          { path: 'search', element: <Search /> },
          { path: 'library', element: <Library /> },
          { path: 'play-together', element: <PlayTogether /> },
          { path: 'play-together/:roomId', element: <PlayTogether /> },
          { path: 'settings', element: <Settings /> },
          { path: '*', element: <Navigate to="/" replace={true} /> },
        ],
      },
    ]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster 
        theme="dark" 
        position="top-right"
        toastOptions={{
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            border: '1px solid hsl(var(--border))',
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;