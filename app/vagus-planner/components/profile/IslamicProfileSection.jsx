import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Star, BookOpen, Award, Plus, X, Edit2, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function IslamicProfileSection() {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    favorite_companions: [],
    favorite_scholars: [],
    islamic_knowledge_level: 'beginner',
    areas_of_study: [],
    current_madhhab: '',
    islamic_biography_notes: ''
  });
  const [newCompanion, setNewCompanion] = useState('');
  const [newScholar, setNewScholar] = useState('');
  const [newArea, setNewArea] = useState('');

  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['islamicProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.IslamicProfile.list();
      return profiles[0] || null;
    }
  });

  React.useEffect(() => {
    if (profile) {
      setFormData({
        favorite_companions: profile.favorite_companions || [],
        favorite_scholars: profile.favorite_scholars || [],
        islamic_knowledge_level: profile.islamic_knowledge_level || 'beginner',
        areas_of_study: profile.areas_of_study || [],
        current_madhhab: profile.current_madhhab || '',
        islamic_biography_notes: profile.islamic_biography_notes || ''
      });
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (profile?.id) {
        return base44.entities.IslamicProfile.update(profile.id, data);
      } else {
        return base44.entities.IslamicProfile.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['islamicProfile'] });
      setEditing(false);
      toast.success('Islamic profile updated');
    }
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const addCompanion = () => {
    if (newCompanion.trim()) {
      setFormData({
        ...formData,
        favorite_companions: [...formData.favorite_companions, newCompanion.trim()]
      });
      setNewCompanion('');
    }
  };

  const removeCompanion = (idx) => {
    setFormData({
      ...formData,
      favorite_companions: formData.favorite_companions.filter((_, i) => i !== idx)
    });
  };

  const addScholar = () => {
    if (newScholar.trim()) {
      setFormData({
        ...formData,
        favorite_scholars: [...formData.favorite_scholars, newScholar.trim()]
      });
      setNewScholar('');
    }
  };

  const removeScholar = (idx) => {
    setFormData({
      ...formData,
      favorite_scholars: formData.favorite_scholars.filter((_, i) => i !== idx)
    });
  };

  const addArea = () => {
    if (newArea.trim()) {
      setFormData({
        ...formData,
        areas_of_study: [...formData.areas_of_study, newArea.trim()]
      });
      setNewArea('');
    }
  };

  const removeArea = (idx) => {
    setFormData({
      ...formData,
      areas_of_study: formData.areas_of_study.filter((_, i) => i !== idx)
    });
  };

  return (
    <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-emerald-900">
            <Star className="w-5 h-5" />
            Islamic Profile
          </span>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {editing ? (
          <>
            {/* Knowledge Level */}
            <div>
              <Label>Islamic Knowledge Level</Label>
              <Select
                value={formData.islamic_knowledge_level}
                onValueChange={(val) => setFormData({ ...formData, islamic_knowledge_level: val })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="scholar">Scholar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Madhhab */}
            <div>
              <Label>School of Thought (Madhhab) - Optional</Label>
              <Input
                value={formData.current_madhhab}
                onChange={(e) => setFormData({ ...formData, current_madhhab: e.target.value })}
                placeholder="e.g., Hanafi, Maliki, Shafi'i, Hanbali"
                className="bg-white"
              />
            </div>

            {/* Favorite Companions */}
            <div>
              <Label>Favorite Companions (RA)</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newCompanion}
                  onChange={(e) => setNewCompanion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCompanion()}
                  placeholder="e.g., Abu Bakr, Umar, Uthman, Ali"
                  className="bg-white"
                />
                <Button onClick={addCompanion} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.favorite_companions.map((companion, idx) => (
                  <Badge key={idx} className="bg-emerald-100 text-emerald-800">
                    {companion}
                    <button onClick={() => removeCompanion(idx)} className="ml-2">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Favorite Scholars */}
            <div>
              <Label>Favorite Scholars</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newScholar}
                  onChange={(e) => setNewScholar(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addScholar()}
                  placeholder="e.g., Ibn Taymiyyah, Al-Ghazali, Ibn Kathir"
                  className="bg-white"
                />
                <Button onClick={addScholar} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.favorite_scholars.map((scholar, idx) => (
                  <Badge key={idx} className="bg-teal-100 text-teal-800">
                    {scholar}
                    <button onClick={() => removeScholar(idx)} className="ml-2">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Areas of Study */}
            <div>
              <Label>Areas of Islamic Study</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addArea()}
                  placeholder="e.g., Fiqh, Tafsir, Hadith, Seerah"
                  className="bg-white"
                />
                <Button onClick={addArea} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.areas_of_study.map((area, idx) => (
                  <Badge key={idx} className="bg-blue-100 text-blue-800">
                    {area}
                    <button onClick={() => removeArea(idx)} className="ml-2">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Personal Biography */}
            <div>
              <Label>Spiritual Journey Notes</Label>
              <Textarea
                value={formData.islamic_biography_notes}
                onChange={(e) => setFormData({ ...formData, islamic_biography_notes: e.target.value })}
                placeholder="Share your spiritual journey, inspirations, and reflections..."
                rows={4}
                className="bg-white"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                <Save className="w-4 h-4 mr-2" />
                Save Profile
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            {profile ? (
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-xl">
                  <Label className="text-slate-600">Knowledge Level</Label>
                  <p className="text-lg font-medium capitalize text-emerald-800">
                    {profile.islamic_knowledge_level || 'Not set'}
                  </p>
                </div>

                {profile.current_madhhab && (
                  <div className="p-4 bg-white rounded-xl">
                    <Label className="text-slate-600">School of Thought</Label>
                    <p className="text-lg font-medium text-emerald-800">{profile.current_madhhab}</p>
                  </div>
                )}

                {profile.favorite_companions && profile.favorite_companions.length > 0 && (
                  <div className="p-4 bg-white rounded-xl">
                    <Label className="text-slate-600 mb-2 block">Favorite Companions (RA)</Label>
                    <div className="flex flex-wrap gap-2">
                      {profile.favorite_companions.map((companion, idx) => (
                        <Badge key={idx} className="bg-emerald-100 text-emerald-800">
                          {companion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {profile.favorite_scholars && profile.favorite_scholars.length > 0 && (
                  <div className="p-4 bg-white rounded-xl">
                    <Label className="text-slate-600 mb-2 block">Favorite Scholars</Label>
                    <div className="flex flex-wrap gap-2">
                      {profile.favorite_scholars.map((scholar, idx) => (
                        <Badge key={idx} className="bg-teal-100 text-teal-800">
                          {scholar}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {profile.areas_of_study && profile.areas_of_study.length > 0 && (
                  <div className="p-4 bg-white rounded-xl">
                    <Label className="text-slate-600 mb-2 block">Areas of Study</Label>
                    <div className="flex flex-wrap gap-2">
                      {profile.areas_of_study.map((area, idx) => (
                        <Badge key={idx} className="bg-blue-100 text-blue-800">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {profile.islamic_biography_notes && (
                  <div className="p-4 bg-white rounded-xl">
                    <Label className="text-slate-600 mb-2 block">Spiritual Journey</Label>
                    <p className="text-sm text-slate-700 leading-relaxed">{profile.islamic_biography_notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                <p className="text-slate-600 mb-4">No Islamic profile created yet</p>
                <Button onClick={() => setEditing(true)} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Profile
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}