import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * Disabled "Coming soon" control. Prefer VpAiFeatureGate (hide) for P0;
 * only use this when a feature is explicitly marked coming soon.
 */
export default function VpAiComingSoon({
  label = 'Coming soon',
  as = 'badge',
  className,
  ...props
}) {
  if (as === 'button') {
    return (
      <Button type="button" disabled variant="outline" className={cn(className)} {...props}>
        {label}
      </Button>
    )
  }
  return (
    <Badge variant="secondary" className={cn('opacity-70', className)} {...props}>
      {label}
    </Badge>
  )
}
