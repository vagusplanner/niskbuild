import React from 'react';

export default function MultiYearZakatTracker() {
  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Multi-Year Zakat Tracker</h3>
      <p className="text-gray-600">Track your zakat payments across multiple years</p>
      <div className="mt-4 space-y-2">
        <div className="flex justify-between border-b border-gray-100 py-2">
          <span>2025</span>
          <span className="font-medium">$2,450</span>
        </div>
        <div className="flex justify-between border-b border-gray-100 py-2">
          <span>2024</span>
          <span className="font-medium">$2,100</span>
        </div>
        <div className="flex justify-between py-2">
          <span>2023</span>
          <span className="font-medium">$1,850</span>
        </div>
      </div>
    </div>
  );
}
