import React, { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';

/**
 * Small Preferences-driven location refresh after timezone / holiday country change.
 * Not the full WelcomeQuestionnaire — city/country only.
 */
export default function LocationDetailsPrompt({
  open,
  onOpenChange,
  islamicMode = false,
  initialCity = '',
  initialCountry = '',
  changedFields = [],
  onConfirm,
  onSkip,
}) {
  const [city, setCity] = useState(initialCity);
  const [country, setCountry] = useState(initialCountry);

  useEffect(() => {
    if (open) {
      setCity(initialCity || '');
      setCountry(initialCountry || '');
    }
  }, [open, initialCity, initialCountry]);

  const changedLabel = changedFields.length
    ? changedFields.join(' and ')
    : 'location settings';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-600" />
            Update your location details?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-2">
            <span className="block">
              You changed your {changedLabel}. Optionally update city and country so calendars
              {islamicMode ? ', prayer times,' : ''} and local features stay accurate.
            </span>
            {!islamicMode && (
              <span className="block text-slate-500">
                This helps timezone-aware scheduling and public holiday calendars for your country —
                no prayer or Qibla settings here.
              </span>
            )}
            {islamicMode && (
              <span className="block text-slate-500">
                Location also informs prayer-time calculations when Islamic Edition is on.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="loc-prompt-city">City</Label>
            <Input
              id="loc-prompt-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g., London"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="loc-prompt-country">Country</Label>
            <Input
              id="loc-prompt-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g., United Kingdom"
              className="mt-1.5"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              onSkip?.();
            }}
          >
            Not now
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-teal-600 hover:bg-teal-700"
            onClick={() => {
              onConfirm?.({ location_city: city.trim(), location_country: country.trim() });
            }}
          >
            Save location
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
