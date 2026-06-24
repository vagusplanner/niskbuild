export function Badge({ children, variant, className }) {
  const variants = { default: 'bg-gray-100 text-gray-800', success: 'bg-green-100 text-green-800', warning: 'bg-yellow-100 text-yellow-800', danger: 'bg-red-100 text-red-800', info: 'bg-blue-100 text-blue-800' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant] || variants.default} ${className}`}>{children}</span>;
}
