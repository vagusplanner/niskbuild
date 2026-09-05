import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // flex (not inline-flex) so w-full + flex-1 triggers align evenly
      "flex h-9 w-full items-center justify-center gap-1 rounded-lg p-1 text-muted-foreground",
      className
    )}
    style={{background:'rgba(212,224,236,0.25)', border:'1px solid rgba(74,110,138,0.3)'}}
    {...props} />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef(({ className, style, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#29ABE2] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      "text-[#4A6E8A] dark:text-[#A8C8E8] hover:text-[#1D6FB8] dark:hover:text-[#29ABE2]",
      "data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:shadow",
      "data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#1D6FB8] data-[state=active]:to-[#29ABE2]",
      className
    )}
    style={style}
    {...props} />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#29ABE2] focus-visible:ring-offset-2",
      className
    )}
    {...props} />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
