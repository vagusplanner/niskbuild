import React, { useState, createContext, useContext } from 'react';

const SelectContext = createContext({});

export function Select({ children, value, onValueChange, className, ...props }) {
  const [selectedValue, setSelectedValue] = useState(value);
  
  const handleSelect = (val) => {
    setSelectedValue(val);
    if (onValueChange) onValueChange(val);
  };

  return (
    <SelectContext.Provider value={{ value: selectedValue, onSelect: handleSelect }}>
      <div className={`relative ${className || ''}`} {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ children, className, ...props }) {
  return (
    <div className={`w-full px-3 py-2 border border-gray-300 rounded-lg bg-white flex items-center justify-between cursor-pointer ${className || ''}`} {...props}>
      {children}
      <span className="ml-2">▼</span>
    </div>
  );
}

export function SelectValue({ children, className, ...props }) {
  return <span className={`text-gray-700 ${className || ''}`} {...props}>{children}</span>;
}

export function SelectContent({ children, className, ...props }) {
  return (
    <div className={`absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto ${className || ''}`} {...props}>
      {children}
    </div>
  );
}

export function SelectItem({ children, value, className, ...props }) {
  const context = useContext(SelectContext);
  const isSelected = context.value === value;
  
  return (
    <div
      className={`px-3 py-2 hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50 text-blue-700' : ''} ${className || ''}`}
      onClick={() => context.onSelect(value)}
      {...props}
    >
      {children}
    </div>
  );
}
