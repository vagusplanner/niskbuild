import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Globe, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' }
].sort((a, b) => a.name.localeCompare(b.name));

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ru', name: 'Russian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ur', name: 'Urdu' }
];

export default function LocalizationSettings() {
  const queryClient = useQueryClient();
  const [detecting, setDetecting] = useState(false);

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });

  const userSettings = settings[0] || {};

  const updateSettingsMutation = useMutation({
    mutationFn: async (data) => {
      if (settings.length > 0) {
        return SDK.entities.UserSettings.update(settings[0].id, data);
      }
      return SDK.entities.UserSettings.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      toast.success('Settings updated!');
    }
  });

  const detectLocationMutation = useMutation({
    mutationFn: async () => {
      return SDK.functions.invoke('detectUserLocation', {});
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      toast.success(`Location detected: ${response.data.location.city}, ${response.data.location.country}`);
      setDetecting(false);
    },
    onError: () => {
      toast.error('Failed to detect location');
      setDetecting(false);
    }
  });

  const handleAutoDetect = () => {
    setDetecting(true);
    detectLocationMutation.mutate();
  };

  const handleManualUpdate = (field, value) => {
    const updates = { [field]: value };
    
    // Auto-update related fields
    if (field === 'currency') {
      const currency = CURRENCIES.find(c => c.code === value);
      updates.currency_symbol = currency?.symbol || '$';
    }
    
    updateSettingsMutation.mutate(updates);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-600" />
          Location & Currency
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-slate-700 mb-3">
            Automatically detect your location and set currency preferences
          </p>
          <Button
            onClick={handleAutoDetect}
            disabled={detecting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {detecting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Auto-Detect Location
          </Button>
        </div>

        {userSettings.location_country && (
          <div className="p-3 bg-green-50 rounded-lg text-sm">
            <p className="font-medium text-green-900">Current Location</p>
            <p className="text-green-700">
              📍 {userSettings.location_city}, {userSettings.location_country}
            </p>
            <p className="text-green-700">
              🕒 {userSettings.timezone}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label>Country</Label>
          <Input
            value={userSettings.location_country || ''}
            onChange={(e) => handleManualUpdate('location_country', e.target.value)}
            placeholder="e.g., United States"
          />
        </div>

        <div className="space-y-2">
          <Label>Currency</Label>
          <Select
            value={userSettings.currency || 'USD'}
            onValueChange={(value) => handleManualUpdate('currency', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(currency => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.name} ({currency.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Language</Label>
          <Select
            value={userSettings.language || 'en'}
            onValueChange={(value) => handleManualUpdate('language', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(lang => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Date Format</Label>
          <Select
            value={userSettings.date_format || 'MM/DD/YYYY'}
            onValueChange={(value) => handleManualUpdate('date_format', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
              <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (International)</SelectItem>
              <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}