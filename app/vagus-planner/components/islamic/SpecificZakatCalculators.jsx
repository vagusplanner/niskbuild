import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Gem, Coins, Building2, Sprout, Calculator, Info } from 'lucide-react';
import { toast } from 'sonner';

const NISAB_GOLD_GRAMS = 87.48; // Standard nisab
const NISAB_SILVER_GRAMS = 612.36;
const ZAKAT_RATE = 0.025; // 2.5%

export default function SpecificZakatCalculators() {
  const [activeTab, setActiveTab] = useState('gold');

  // Gold/Silver state
  const [goldWeight, setGoldWeight] = useState('');
  const [goldPricePerGram, setGoldPricePerGram] = useState('');
  const [silverWeight, setSilverWeight] = useState('');
  const [silverPricePerGram, setSilverPricePerGram] = useState('');

  // Business inventory state
  const [inventory, setInventory] = useState('');
  const [accountsReceivable, setAccountsReceivable] = useState('');
  const [cash, setCash] = useState('');
  const [liabilities, setLiabilities] = useState('');

  // Agricultural produce state
  const [produceValue, setProduceValue] = useState('');
  const [irrigationType, setIrrigationType] = useState('rain'); // rain or irrigated

  const calculateGoldZakat = () => {
    const weight = parseFloat(goldWeight);
    const price = parseFloat(goldPricePerGram);
    
    if (weight < NISAB_GOLD_GRAMS) {
      toast.info(`Gold below Nisab threshold (${NISAB_GOLD_GRAMS}g). No Zakat due.`);
      return 0;
    }
    
    const totalValue = weight * price;
    const zakat = totalValue * ZAKAT_RATE;
    return { totalValue, zakat };
  };

  const calculateSilverZakat = () => {
    const weight = parseFloat(silverWeight);
    const price = parseFloat(silverPricePerGram);
    
    if (weight < NISAB_SILVER_GRAMS) {
      toast.info(`Silver below Nisab threshold (${NISAB_SILVER_GRAMS}g). No Zakat due.`);
      return 0;
    }
    
    const totalValue = weight * price;
    const zakat = totalValue * ZAKAT_RATE;
    return { totalValue, zakat };
  };

  const calculateBusinessZakat = () => {
    const inv = parseFloat(inventory) || 0;
    const ar = parseFloat(accountsReceivable) || 0;
    const cashVal = parseFloat(cash) || 0;
    const liab = parseFloat(liabilities) || 0;
    
    const zakatable = inv + ar + cashVal - liab;
    
    if (zakatable <= 0) {
      toast.info('No zakatable business assets after liabilities.');
      return 0;
    }
    
    const zakat = zakatable * ZAKAT_RATE;
    return { zakatable, zakat };
  };

  const calculateAgricultureZakat = () => {
    const value = parseFloat(produceValue) || 0;
    
    // 10% for rain-fed, 5% for irrigated
    const rate = irrigationType === 'rain' ? 0.10 : 0.05;
    const zakat = value * rate;
    
    return { value, zakat, rate };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-purple-600" />
          Specific Zakat Calculators
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="gold" className="flex items-center gap-1">
              <Gem className="w-4 h-4" />
              <span className="hidden sm:inline">Gold</span>
            </TabsTrigger>
            <TabsTrigger value="silver" className="flex items-center gap-1">
              <Coins className="w-4 h-4" />
              <span className="hidden sm:inline">Silver</span>
            </TabsTrigger>
            <TabsTrigger value="business" className="flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Business</span>
            </TabsTrigger>
            <TabsTrigger value="agriculture" className="flex items-center gap-1">
              <Sprout className="w-4 h-4" />
              <span className="hidden sm:inline">Agriculture</span>
            </TabsTrigger>
          </TabsList>

          {/* Gold Calculator */}
          <TabsContent value="gold" className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  Nisab threshold: {NISAB_GOLD_GRAMS}g of gold. Zakat rate: 2.5%
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Gold Weight (grams)</Label>
                <Input
                  type="number"
                  value={goldWeight}
                  onChange={(e) => setGoldWeight(e.target.value)}
                  placeholder="e.g., 100"
                />
              </div>
              <div>
                <Label>Current Gold Price (per gram)</Label>
                <Input
                  type="number"
                  value={goldPricePerGram}
                  onChange={(e) => setGoldPricePerGram(e.target.value)}
                  placeholder="e.g., 60"
                />
              </div>
            </div>

            <Button
              onClick={() => {
                const result = calculateGoldZakat();
                if (result) {
                  toast.success(
                    `Gold Value: $${result.totalValue.toLocaleString()} | Zakat Due: $${result.zakat.toFixed(2)}`
                  );
                }
              }}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              Calculate Gold Zakat
            </Button>
          </TabsContent>

          {/* Silver Calculator */}
          <TabsContent value="silver" className="space-y-4">
            <div className="p-3 bg-slate-100 rounded-lg border border-slate-300">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-700">
                  Nisab threshold: {NISAB_SILVER_GRAMS}g of silver. Zakat rate: 2.5%
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Silver Weight (grams)</Label>
                <Input
                  type="number"
                  value={silverWeight}
                  onChange={(e) => setSilverWeight(e.target.value)}
                  placeholder="e.g., 700"
                />
              </div>
              <div>
                <Label>Current Silver Price (per gram)</Label>
                <Input
                  type="number"
                  value={silverPricePerGram}
                  onChange={(e) => setSilverPricePerGram(e.target.value)}
                  placeholder="e.g., 0.75"
                />
              </div>
            </div>

            <Button
              onClick={() => {
                const result = calculateSilverZakat();
                if (result) {
                  toast.success(
                    `Silver Value: $${result.totalValue.toLocaleString()} | Zakat Due: $${result.zakat.toFixed(2)}`
                  );
                }
              }}
              className="w-full bg-slate-600 hover:bg-slate-700"
            >
              Calculate Silver Zakat
            </Button>
          </TabsContent>

          {/* Business Inventory Calculator */}
          <TabsContent value="business" className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                  Include inventory, accounts receivable, and cash. Subtract liabilities.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Inventory Value</Label>
                <Input
                  type="number"
                  value={inventory}
                  onChange={(e) => setInventory(e.target.value)}
                  placeholder="Total inventory value"
                />
              </div>
              <div>
                <Label>Accounts Receivable</Label>
                <Input
                  type="number"
                  value={accountsReceivable}
                  onChange={(e) => setAccountsReceivable(e.target.value)}
                  placeholder="Money owed to you"
                />
              </div>
              <div>
                <Label>Cash/Bank Balance</Label>
                <Input
                  type="number"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  placeholder="Liquid assets"
                />
              </div>
              <div>
                <Label>Current Liabilities</Label>
                <Input
                  type="number"
                  value={liabilities}
                  onChange={(e) => setLiabilities(e.target.value)}
                  placeholder="Debts to deduct"
                />
              </div>
            </div>

            <Button
              onClick={() => {
                const result = calculateBusinessZakat();
                if (result) {
                  toast.success(
                    `Zakatable Assets: $${result.zakatable.toLocaleString()} | Zakat Due: $${result.zakat.toFixed(2)}`
                  );
                }
              }}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Calculate Business Zakat
            </Button>
          </TabsContent>

          {/* Agricultural Produce Calculator */}
          <TabsContent value="agriculture" className="space-y-4">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-800">
                  10% for rain-fed crops, 5% for irrigated crops
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Total Produce Value</Label>
                <Input
                  type="number"
                  value={produceValue}
                  onChange={(e) => setProduceValue(e.target.value)}
                  placeholder="Market value of harvest"
                />
              </div>
              <div>
                <Label>Irrigation Type</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={irrigationType === 'rain' ? 'default' : 'outline'}
                    onClick={() => setIrrigationType('rain')}
                    className="flex-1"
                  >
                    Rain-fed (10%)
                  </Button>
                  <Button
                    type="button"
                    variant={irrigationType === 'irrigated' ? 'default' : 'outline'}
                    onClick={() => setIrrigationType('irrigated')}
                    className="flex-1"
                  >
                    Irrigated (5%)
                  </Button>
                </div>
              </div>
            </div>

            <Button
              onClick={() => {
                const result = calculateAgricultureZakat();
                toast.success(
                  `Produce Value: $${result.value.toLocaleString()} | Zakat Due (${result.rate * 100}%): $${result.zakat.toFixed(2)}`
                );
              }}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Calculate Agricultural Zakat
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}