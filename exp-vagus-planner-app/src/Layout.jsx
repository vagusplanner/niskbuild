import React from 'react';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900">NiskBuild</h1>
          <nav className="flex gap-4">
            <a href="/" className="text-gray-600 hover:text-gray-900">Dashboard</a>
            <a href="/calendar" className="text-gray-600 hover:text-gray-900">Calendar</a>
            <a href="/islam" className="text-gray-600 hover:text-gray-900">Islam</a>
            <a href="/travel" className="text-gray-600 hover:text-gray-900">Travel</a>
            <a href="/profile" className="text-gray-600 hover:text-gray-900">Profile</a>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
