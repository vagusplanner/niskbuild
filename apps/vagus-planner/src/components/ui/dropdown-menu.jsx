import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, ChevronRight, Circle } from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

import { cn } from "@/lib/utils"

const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
};

const MobileDropdownContext = React.createContext(null);

const DropdownMenu = ({ children, ...props }) => {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [mobileItems, setMobileItems] = React.useState([]);
  
  // Always wrap with Radix Root on desktop, only use mobile context if on mobile
  return (
    <DropdownMenuPrimitive.Root {...props}>
      {isMobile ? (
        <MobileDropdownContext.Provider value={{ mobileOpen, setMobileOpen, setMobileItems, mobileItems }}>
          <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
            {children}
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Options</DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-6 max-h-[60vh] overflow-auto">
                {mobileItems.map((item, index) => {
                  if (item.type === 'separator') {
                    return <div key={index} className="h-px bg-border my-2" />;
                  }
                  
                  if (item.type === 'label') {
                    return <div key={index} className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">{item.label}</div>;
                  }
                  
                  return (
                    <button
                      key={index}
                      disabled={item.disabled}
                      onClick={() => {
                        item.onSelect?.();
                        setMobileOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg mb-2 transition-colors",
                        "hover:bg-accent active:bg-accent",
                        item.disabled && "opacity-50 cursor-not-allowed",
                        item.destructive && "text-destructive"
                      )}
                    >
                      {item.icon}
                      <span className="flex-1">{item.label}</span>
                      {item.checked && <Check className="w-5 h-5" />}
                    </button>
                  );
                })}
              </div>
            </DrawerContent>
          </Drawer>
        </MobileDropdownContext.Provider>
      ) : (
        <>{children}</>
      )}
    </DropdownMenuPrimitive.Root>
  );
}

const DropdownMenuTrigger = React.forwardRef(({ children, asChild, ...props }, ref) => {
  const isMobile = useIsMobile();
  const context = React.useContext(MobileDropdownContext);
  
  // On mobile with context available, handle mobile-specific behavior
  if (isMobile && context) {
    if (asChild) {
      return React.cloneElement(children, {
        ref,
        onClick: (e) => {
          children.props.onClick?.(e);
          context.setMobileOpen(true);
        },
        ...props
      });
    }
    return (
      <button
        ref={ref}
        onClick={() => context.setMobileOpen(true)}
        {...props}
      >
        {children}
      </button>
    );
  }
  
  // Always use Radix trigger as fallback
  return <DropdownMenuPrimitive.Trigger ref={ref} asChild={asChild} {...props}>{children}</DropdownMenuPrimitive.Trigger>;
})
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

const DropdownMenuGroup = ({ children, ...props }) => {
  const isMobile = useIsMobile();
  if (isMobile) return <>{children}</>;
  return <DropdownMenuPrimitive.Group {...props}>{children}</DropdownMenuPrimitive.Group>;
}

const DropdownMenuPortal = ({ children, ...props }) => {
  const isMobile = useIsMobile();
  if (isMobile) return null;
  return <DropdownMenuPrimitive.Portal {...props}>{children}</DropdownMenuPrimitive.Portal>;
}

const DropdownMenuSub = ({ children, ...props }) => {
  const isMobile = useIsMobile();
  if (isMobile) return <>{children}</>;
  return <DropdownMenuPrimitive.Sub {...props}>{children}</DropdownMenuPrimitive.Sub>;
}

const DropdownMenuRadioGroup = ({ children, ...props }) => {
  const isMobile = useIsMobile();
  if (isMobile) return <>{children}</>;
  return <DropdownMenuPrimitive.RadioGroup {...props}>{children}</DropdownMenuPrimitive.RadioGroup>;
}

const DropdownMenuSubTrigger = React.forwardRef(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className
    )}
    {...props}>
    {children}
    <ChevronRight className="ml-auto" />
  </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props} />
))
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName

const DropdownMenuContent = React.forwardRef(({ className, sideOffset = 4, children, ...props }, ref) => {
  const isMobile = useIsMobile();
  const context = React.useContext(MobileDropdownContext);
  const prevKeyRef = React.useRef(null);

  // Sync mobile items without infinite loop — compare serialized key
  if (isMobile && context && children) {
    const items = [];
    React.Children.forEach(children, (child) => {
      if (!child) return;
      if (child.type?.displayName === 'DropdownMenuItem') {
        items.push({
          type: 'item',
          label: child.props.children,
          onSelect: child.props.onClick,
          disabled: child.props.disabled,
          destructive: child.props.className?.includes('destructive')
        });
      } else if (child.type?.displayName === 'DropdownMenuSeparator') {
        items.push({ type: 'separator' });
      } else if (child.type?.displayName === 'DropdownMenuLabel') {
        items.push({ type: 'label', label: child.props.children });
      }
    });
    const key = items.length + '|' + items.map(i => i.type + ':' + String(i.disabled)).join(',');
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key;
      // Use setTimeout to avoid setState-during-render
      setTimeout(() => context.setMobileItems(items), 0);
    }
  }

  if (isMobile && context) {
    return null;
  }

  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}>
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
})
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
      inset && "pl-8",
      className
    )}
    {...props} />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuCheckboxItem = React.forwardRef(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}>
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}>
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

const DropdownMenuLabel = React.forwardRef(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
    {...props} />
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props} />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuShortcut = ({
  className,
  ...props
}) => {
  return (
    (<span
      className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
      {...props} />)
  );
}
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}