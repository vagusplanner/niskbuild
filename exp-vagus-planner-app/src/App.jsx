import React from 'react';
import { Toaster } from 'sonner';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import AppRoutes from './routes';
import './index.css';

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AppRoutes />
      <Toaster position="bottom-right" richColors closeButton />
    </QueryClientProvider>
  );
}

export default App;
// Add future flags to BrowserRouter
import { BrowserRouter } from 'react-router-dom';

// In your routes file, wrap with:
<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
  {/* routes */}
</BrowserRouter>
