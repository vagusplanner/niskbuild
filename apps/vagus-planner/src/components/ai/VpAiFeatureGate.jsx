import { requireVpAiFunctions } from '@/lib/vp-registered-functions'

/** Hide children unless every required VP function is registered. */
export default function VpAiFeatureGate({ requires, children }) {
  const names = Array.isArray(requires) ? requires : [requires]
  if (!requireVpAiFunctions(...names)) return null
  return children
}
