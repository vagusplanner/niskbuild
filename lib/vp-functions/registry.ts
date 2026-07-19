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
  getPrayerTimesForUser,
  getWeatherForecast,
} from './handlers/geo';
import { hadithSRSChallenge } from './handlers/hadith-srs';
import { globalSearch } from './handlers/search';
import {
  aiEventSummary,
  aiMeetingAssistant,
  aiSchedulePlanner,
  aiSchedulingSuggestions,
  advancedMeetingScheduler,
  findOptimalMeetingTimes,
  parseNaturalLanguageEvent,
  suggestMeetingTimes,
  suggestOptimalMeetingTime,
  suggestPrayerAwareMeetingTimes,
} from './handlers/calendar-ai';
import { transcribeAudio } from './handlers/transcribe-audio';
import { onNewUserWelcome, trackAnalytics } from './handlers/stubs';

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
  ['getPrayerTimesForUser', getPrayerTimesForUser],
  ['hadithSRSChallenge', hadithSRSChallenge],
  ['globalSearch', globalSearch],
  ['deleteUserAccount', deleteUserAccount],
  ['parseNaturalLanguageEvent', parseNaturalLanguageEvent],
  ['aiSchedulePlanner', aiSchedulePlanner],
  ['aiSchedulingSuggestions', aiSchedulingSuggestions],
  ['advancedMeetingScheduler', advancedMeetingScheduler],
  ['findOptimalMeetingTimes', findOptimalMeetingTimes],
  ['suggestOptimalMeetingTime', suggestOptimalMeetingTime],
  ['suggestMeetingTimes', suggestMeetingTimes],
  ['suggestPrayerAwareMeetingTimes', suggestPrayerAwareMeetingTimes],
  ['aiMeetingAssistant', aiMeetingAssistant],
  ['transcribeAudio', transcribeAudio],
  ['trackAnalytics', trackAnalytics],
  ['onNewUserWelcome', onNewUserWelcome],
  ['aiEventSummary', aiEventSummary],
]);

export function getVpFunctionHandler(name: string): VpFunctionHandler | undefined {
  return VP_FUNCTION_REGISTRY.get(name);
}

export function listRegisteredVpFunctions(): string[] {
  return [...VP_FUNCTION_REGISTRY.keys()].sort();
}
