/** Must match Layout.jsx mobile tab bar: 3.5rem row + 2px border + safe-area + tap gap. */
export const MOBILE_NAV_CLEARANCE =
  'calc(3.5rem + 2px + env(safe-area-inset-bottom, 0px) + 0.75rem)';

export const MOBILE_OVERLAY_Z = 150;

/** Menus/drawers/popovers that open from inside modals (dialogs can be z-100–200). */
export const NESTED_MENU_Z = MOBILE_OVERLAY_Z + 70;
