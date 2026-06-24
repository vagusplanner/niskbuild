import React from 'react';

export function StatusDot({ status, className }) {
  const colors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    busy: 'bg-red-500',
    away: 'bg-yellow-500',
  };
  return <span className={`inline-block w-3 h-3 rounded-full ${colors[status] || colors.offline} ${className || ''}`} />;
}

export default function UserProfileCard({ user, className }) {
  return (
    <div className={`flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-200 ${className || ''}`}>
      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-600">
        {user?.name?.[0] || 'U'}
      </div>
      <div>
        <h4 className="font-medium text-gray-900">{user?.name || 'User'}</h4>
        <p className="text-sm text-gray-500">{user?.email || 'user@example.com'}</p>
      </div>
    </div>
  );
}
