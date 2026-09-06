import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Gem, Coins, Building2, Sprout, Calculator, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  NISAB_GOLD_GRAMS,
  NISAB_SILVER_GRAMS,
  ZAKAT_RATE,
  calculateGoldWeightZakat,
  calculateSilverWeightZakat,
  calculateBusinessZakat,
  calculateAgricultureZakat,
} from '@/lib/zakat-engine';

export default function SpecificZakatCalculators() {
  const [activeTab, setActiveTab] = useState('gold');
  const [goldWeight, setGoldWeight] = useState('');
  const [goldPricePerGram, setGoldPricePerGram] = useState('');
  const [silverWeight, setSilverWeight] = useState('');
  const [silverPricePerGram, setSilverPricePerGram] = useState('');
  const [inventory, setInventory] = useState('');
  const [accountsReceivable, setAccountsReceivable] = useState('');
  const [cash, setCash] = useState('');
  const [liabilities, setLiabilities] = useState('');
  const [produceValue, setProduceValue] = useState('');
  const [irrigationType, setIrrigationType] = useState('rain');

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
              <Gem className="w-4 h-4" /><span className="hidden sm:inline">Gold</span>
            </TabsTrigger>
            <TabsTrigger value="silver" className="flex items-center gap-1">
              <Coins className="w-4 h-4" /><span className="hidden sm:inline">Silver</span>
            </TabsTrigger>
            <TabsTrigger value="business" className="flex items-center gap-1">
              <Building2 className="w-4 h-4" /><span className="hidden sm:inline">Business</span>
            </TabsTrigger>
            <TabsTrigger value="agriculture" className="flex items-center gap-1">
              <Sprout className="w-4 h-4" /><span className="hidden sm:inline">Agriculture</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gold" className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  Canonical nisab: {NISAB_GOLD_GRAMS}g gold. Rate: {ZAKAT_RATE * 100}%
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Gold Weight (grams)</Label>
                <Input type="number" value={goldWeight} onChange={(e) => setGoldWeight(e.target.value)} placeholder="e.g., 100" />
              </div>
              <div>
                <Label>Current Gold Price (per gram)</Label>
                <Input type="number" value={goldPricePerGram} onChange={(e) => setGoldPricePerGram(e.target.value)} placeholder="e.g., 60" />
              </div>
            </div>
            <Button
              onClick={() => {
                const result = calculateGoldWeightZakat(goldWeight, goldPricePerGram);
                if (!result.meetsNisab) {
                  toast.info(`Gold below Nisab threshold (${NISAB_GOLD_GRAMS}g). No Zakat due.`);
                  return;
                }
                toast.success(`Gold Value: $${result.totalValue.toLocaleString()} | Zakat Due: $${result.zakatDue.toFixed(2)}`);
              }}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              Calculate Gold Zakat
            </Button>
          </TabsContent>

          <TabsContent value="silver" className="space-y-4">
            <div className="p-3 bg-slate-100 rounded-lg border border-slate-300">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-700">
                  Canonical nisab: {NISAB_SILVER_GRAMS}g silver. Rate: {ZAKAT_RATE * 100}%
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Silver Weight (grams)</Label>
                <Input type="number" value={silverWeight} onChange={(e) => setSilverWeight(e.target.value)} placeholder="e.g., 700" />
              </div>
              <div>
                <Label>Current Silver Price (per gram)</Label>
                <Input type="number" value={silverPricePerGram} onChange={(e) => setSilverPricePerGram(e.target.value)} placeholder="e.g., 0.75" />
              </div>
            </div>
            <Button
              onClick={() => {
                const result = calculateSilverWeightZakat(silverWeight, silverPricePerGram);
                if (!result.meetsNisab) {
                  toast.info(`Silver below Nisab threshold (${NISAB_SILVER_GRAMS}g). No Zakat due.`);
                  return;
                }
                toast.success(`Silver Value: $${result.totalValue.toLocaleString()} | Zakat Due: $${result.zakatDue.toFixed(2)}`);
              }}
              className="w-full bg-slate-600 hover:bg-slate-700"
            >
              Calculate Silver Zakat
            </Button>
          </TabsContent>

          <TabsContent value="business" className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                  Inventory + receivables + cash − liabilities. Rate {ZAKAT_RATE * 100}%.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div><Label>Inventory Value</Label><Input type="number" value={inventory} onChange={(e) => setInventory(e.target.value)} /></div>
              <div><Label>Accounts Receivable</Label><Input type="number" value={accountsReceivable} onChange={(e) => setAccountsReceivable(e.target.value)} /></div>
              <div><Label>Cash/Bank Balance</Label><Input type="number" value={cash} onChange={(e) => setCash(e.target.value)} /></div>
              <div><Label>Current Liabilities</Label><Input type="number" value={liabilities} onChange={(e) => setLiabilities(e.target.value)} /></div>
            </div>
            <Button
              onClick={() => {
                const result = calculateBusinessZakat({ inventory, receivables: accountsReceivable, cash, liabilities });
                if (!result.zakatable) {
                  toast.info('No zakatable business assets after liabilities.');
                  return;
                }
                toast.success(`Zakatable: $${result.zakatable.toFixed(2)} | Zakat: $${result.zakatDue.toFixed(2)}`);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Calculate Business Zakat
            </Button>
          </TabsContent>

          <TabsContent value="agriculture" className="space-y-4">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-800">
                  Distinct fiqh rate: 10% rain-fed, 5% irrigated (not the 2.5% wealth rate).
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div><Label>Produce Value</Label><Input type="number" value={produceValue} onChange={(e) => setProduceValue(e.target.value)} /></div>
              <div className="flex gap-2">
                <Button type="button" variant={irrigationType === 'rain' ? 'default' : 'outline'} onClick={() => setIrrigationType('rain')}>Rain-fed 10%</Button>
                <Button type="button" variant={irrigationType === 'irrigated' ? 'default' : 'outline'} onClick={() => setIrrigationType('irrigated')}>Irrigated 5%</Button>
              </div>
            </div>
            <Button
              onClick={() => {
                const result = calculateAgricultureZakat(produceValue, irrigationType);
                toast.success(`Agriculture Zakat (${result.rate * 100}%): $${result.zakatDue.toFixed(2)}`);
              }}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Calculate Agriculture Zakat
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
