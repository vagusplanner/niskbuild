import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Apple, Droplet, TrendingUp, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const MEAL_TYPES = [
  { value: 'breakfast', label: '🌅 Breakfast', color: 'from-orange-400 to-yellow-400' },
  { value: 'lunch', label: '☀️ Lunch', color: 'from-blue-400 to-cyan-400' },
  { value: 'dinner', label: '🌙 Dinner', color: 'from-indigo-400 to-purple-400' },
  { value: 'snack', label: '🍎 Snack', color: 'from-green-400 to-teal-400' }
];

export default function NutritionTracker() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formData, setFormData] = useState({
    date: selectedDate,
    meal_type: 'breakfast',
    meal_name: '',
    calories: '',
    protein: '',
    carbs: '',
    fats: '',
    water_ml: '',
    notes: ''
  });
  const queryClient = useQueryClient();

  const { data: todayMeals = [] } = useQuery({
    queryKey: ['nutrition', selectedDate],
    queryFn: () => base44.entities.Nutrition.filter({ date: selectedDate }, '-created_date')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Nutrition.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
      setShowDialog(false);
      setFormData({
        date: selectedDate,
        meal_type: 'breakfast',
        meal_name: '',
        calories: '',
        protein: '',
        carbs: '',
        fats: '',
        water_ml: '',
        notes: ''
      });
      toast.success('Meal logged!');
    }
  });

  const totals = todayMeals.reduce((acc, meal) => ({
    calories: acc.calories + (meal.calories || 0),
    protein: acc.protein + (meal.protein || 0),
    carbs: acc.carbs + (meal.carbs || 0),
    fats: acc.fats + (meal.fats || 0),
    water: acc.water + (meal.water_ml || 0)
  }), { calories: 0, protein: 0, carbs: 0, fats: 0, water: 0 });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Apple className="w-5 h-5 text-green-600" />
              Nutrition Tracking
            </CardTitle>
            <Button onClick={() => setShowDialog(true)} size="sm" className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Log Meal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Daily Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-700">{totals.calories}</div>
              <div className="text-xs text-orange-600">Calories</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-700">{totals.protein}g</div>
              <div className="text-xs text-red-600">Protein</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-amber-700">{totals.carbs}g</div>
              <div className="text-xs text-amber-600">Carbs</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-700">{totals.fats}g</div>
              <div className="text-xs text-yellow-600">Fats</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center flex items-center justify-center gap-2">
              <Droplet className="w-4 h-4 text-blue-600" />
              <div>
                <div className="text-xl font-bold text-blue-700">{totals.water}ml</div>
                <div className="text-xs text-blue-600">Water</div>
              </div>
            </div>
          </div>

          {/* Meals List */}
          <div className="space-y-3">
            {MEAL_TYPES.map(mealType => {
              const meals = todayMeals.filter(m => m.meal_type === mealType.value);
              return (
                <div key={mealType.value} className="border rounded-lg p-3">
                  <div className="font-semibold text-sm text-slate-700 mb-2">{mealType.label}</div>
                  {meals.length > 0 ? (
                    meals.map(meal => (
                      <div key={meal.id} className="flex items-center justify-between py-1">
                        <span className="text-sm text-slate-600">{meal.meal_name}</span>
                        <span className="text-sm font-medium text-slate-700">{meal.calories || 0} cal</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-400 italic">No meals logged</div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Log Meal Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Meal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Meal Type</Label>
              <Select value={formData.meal_type} onValueChange={(val) => setFormData({ ...formData, meal_type: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Meal Name</Label>
              <Input
                value={formData.meal_name}
                onChange={(e) => setFormData({ ...formData, meal_name: e.target.value })}
                placeholder="e.g., Chicken Salad"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Calories</Label>
                <Input
                  type="number"
                  value={formData.calories}
                  onChange={(e) => setFormData({ ...formData, calories: parseFloat(e.target.value) || '' })}
                />
              </div>
              <div>
                <Label>Protein (g)</Label>
                <Input
                  type="number"
                  value={formData.protein}
                  onChange={(e) => setFormData({ ...formData, protein: parseFloat(e.target.value) || '' })}
                />
              </div>
              <div>
                <Label>Carbs (g)</Label>
                <Input
                  type="number"
                  value={formData.carbs}
                  onChange={(e) => setFormData({ ...formData, carbs: parseFloat(e.target.value) || '' })}
                />
              </div>
              <div>
                <Label>Fats (g)</Label>
                <Input
                  type="number"
                  value={formData.fats}
                  onChange={(e) => setFormData({ ...formData, fats: parseFloat(e.target.value) || '' })}
                />
              </div>
            </div>
            <div>
              <Label>Water (ml)</Label>
              <Input
                type="number"
                value={formData.water_ml}
                onChange={(e) => setFormData({ ...formData, water_ml: parseFloat(e.target.value) || '' })}
                placeholder="e.g., 250"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes..."
              />
            </div>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.meal_name}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Log Meal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}