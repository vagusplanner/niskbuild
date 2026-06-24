export function DropdownMenu({ children }) { return <div className="relative inline-block">{children}</div>; }
export function DropdownMenuTrigger({ children }) { return <div>{children}</div>; }
export function DropdownMenuContent({ children, align }) { return <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">{children}</div>; }
export function DropdownMenuItem({ children, onClick }) { return <button className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors" onClick={onClick}>{children}</button>; }
