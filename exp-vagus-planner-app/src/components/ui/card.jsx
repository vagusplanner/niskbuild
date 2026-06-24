import React from 'react';

export function Card({ children, className }) {
  return <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className || ''}`}>{children}</div>;
}

export function CardHeader({ children, className }) {
  return <div className={`px-6 py-4 border-b border-gray-200 ${className || ''}`}>{children}</div>;
}

export function CardContent({ children, className }) {
  return <div className={`px-6 py-4 ${className || ''}`}>{children}</div>;
}

export function CardFooter({ children, className }) {
  return <div className={`px-6 py-4 border-t border-gray-200 ${className || ''}`}>{children}</div>;
}

export function CardTitle({ children, className }) {
  return <h3 className={`text-lg font-semibold text-gray-900 ${className || ''}`}>{children}</h3>;
}

export function CardDescription({ children, className }) {
  return <p className={`text-sm text-gray-500 ${className || ''}`}>{children}</p>;
}
