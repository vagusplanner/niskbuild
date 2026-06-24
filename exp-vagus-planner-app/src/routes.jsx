import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Islam from './pages/Islam';
import Travel from './pages/Travel';
import Profile from './pages/Profile';
import Connect from './pages/Connect';
import Islamic from './pages/Islamic';
import Layout from './Layout';

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/islam" element={<Islam />} />
          <Route path="/islamic" element={<Islamic />} />
          <Route path="/travel" element={<Travel />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/connect" element={<Connect />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
