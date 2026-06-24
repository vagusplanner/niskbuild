import React, { useState } from 'react';
export function Tabs({ children, defaultValue }) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return React.Children.map(children, (child) => {
    if (child.type === TabsList) return React.cloneElement(child, { activeTab, setActiveTab });
    if (child.type === TabsContent && child.props.value === activeTab) return child;
    return null;
  });
}
export function TabsList({ children, activeTab, setActiveTab }) {
  return <div className="flex border-b border-gray-200 mb-4">{React.Children.map(children, (child) => React.cloneElement(child, { activeTab, setActiveTab }))}</div>;
}
export function TabsTrigger({ children, value, activeTab, setActiveTab }) {
  const isActive = activeTab === value;
  return <button className={`px-4 py-2 text-sm font-medium transition-colors ${isActive ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab(value)}>{children}</button>;
}
export function TabsContent({ children }) { return <div>{children}</div>; }
