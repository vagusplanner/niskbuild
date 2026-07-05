import type { VpFunctionHandler } from './types';
import {
  cancelStripeSubscription,
  createCustomerPortalSession,
  createStripeCheckout,
} from './handlers/billing';
import { sendContactForm } from './handlers/contact';
import { deleteUserAccount } from './handlers/account';
import {
  detectUserLocation,
  fetchPublicHolidays,
  findHalalRestaurants,
  getHalalAndPrayerLocations,
  getWeatherForecast,
} from './handlers/geo';
import { hadithSRSChallenge } from './handlers/hadith-srs';
import { globalSearch } from './handlers/search';

export const VP_FUNCTION_REGISTRY = new Map<string, VpFunctionHandler>([
  ['createStripeCheckout', createStripeCheckout],
  ['createCustomerPortalSession', createCustomerPortalSession],
  ['cancelStripeSubscription', cancelStripeSubscription],
  ['sendContactForm', sendContactForm],
  ['findHalalRestaurants', findHalalRestaurants],
  ['getHalalAndPrayerLocations', getHalalAndPrayerLocations],
  ['getWeatherForecast', getWeatherForecast],
  ['detectUserLocation', detectUserLocation],
  ['fetchPublicHolidays', fetchPublicHolidays],
  ['hadithSRSChallenge', hadithSRSChallenge],
  ['globalSearch', globalSearch],
  ['deleteUserAccount', deleteUserAccount],
]);

export function getVpFunctionHandler(name: string): VpFunctionHandler | undefined {
  return VP_FUNCTION_REGISTRY.get(name);
}

export function listRegisteredVpFunctions(): string[] {
  return [...VP_FUNCTION_REGISTRY.keys()].sort();
}
