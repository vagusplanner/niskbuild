import * as React from "react"
import { Check } from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

export const MobileDropdownContext = React.createContext(null);

export function MobileDropdownMenu({ children, open, onOpenChange }) {
  const [items, setItems] = React.useState([]);
  const [trigger, setTrigger] = React.useState(null);
  
  const addItem = React.useCallback((item) => {
    setItems(prev => [...prev, item]);
  }, []);
  
  const clearItems = React.useCallback(() => {
    setItems([]);
  }, []);
  
  return (
    <MobileDropdownContext.Provider value={{ addItem, clearItems, setTrigger }}>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <div className="relative">
          {children}
        </div>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Options</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 max-h-[60vh] overflow-auto">
            {items.map((item, index) => {
              if (item.type === 'separator') {
                return <div key={index} className="h-px bg-border my-2" />;
              }
              
              return (
                <button
                  key={index}
                  disabled={item.disabled}
                  onClick={() => {
                    item.onSelect?.();
                    onOpenChange?.(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg mb-2 transition-colors",
                    "hover:bg-accent active:bg-accent",
                    item.disabled && "opacity-50 cursor-not-allowed",
                    item.destructive && "text-destructive"
                  )}
                >
                  {item.icon && <span className="w-5 h-5">{item.icon}</span>}
                  <span className="flex-1">{item.label}</span>
                  {item.checked && <Check className="w-5 h-5" />}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </MobileDropdownContext.Provider>
  );
}

export function MobileDropdownMenuItem({ children, onSelect, disabled, icon, destructive, checked }) {
  const context = React.useContext(MobileDropdownContext);
  
  React.useEffect(() => {
    if (context) {
      context.addItem({
        type: 'item',
        label: children,
        onSelect,
        disabled,
        icon,
        destructive,
        checked
      });
    }
    
    return () => {
      // Cleanup handled by parent
    };
  }, [children, onSelect, disabled, icon, destructive, checked]);
  
  return null;
}

export function MobileDropdownSeparator() {
  const context = React.useContext(MobileDropdownContext);
  
  React.useEffect(() => {
    if (context) {
      context.addItem({ type: 'separator' });
    }
  }, []);
  
  return null;
}