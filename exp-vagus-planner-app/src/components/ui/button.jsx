import React from 'react';

export const buttonVariants = {
  default: 'bg-blue-600 text-white hover:bg-blue-700',
  outline: 'border border-gray-300 hover:bg-gray-50',
  ghost: 'hover:bg-gray-100',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
  success: 'bg-green-600 text-white hover:bg-green-700',
};

export function Button({ children, onClick, variant, className, ...props }) {
  const variantClass = buttonVariants[variant] || buttonVariants.default;
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${variantClass} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  );
}
