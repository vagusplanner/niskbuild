import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Search, MapPin, Heart, ExternalLink, Filter, Globe, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CHARITY_CATEGORIES = ['All', 'Orphans', 'Education', 'Healthcare', 'Disaster Relief', 'Mosques', 'Water Projects', 'Refugees'];

export default function CharityDirectory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [locationFilter, setLocationFilter] = useState('all'); // all, local, international
  const [discovering, setDiscovering] = useState(false);
  const [charities, setCharities] = useState([]);
  const queryClient = useQueryClient();

  const discoverCharities = async () => {
    setDiscovering(true);
    try {
      const prompt = `Generate a list of 8 reputable Islamic charities and humanitarian organizations. Include both international and local organizations. For each charity, provide:
      - name: Organization name
      - description: Brief description (1-2 sentences)
      - category: One of [Orphans, Education, Healthcare, Disaster Relief, Mosques, Water Projects, Refugees]
      - scope: "International" or "Local"
      - website: Realistic website URL (use .org domains)
      - location: Country/Region
      - focus_areas: Array of 2-3 specific areas they work in

      Focus on well-known Islamic relief organizations and include diverse causes.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            charities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  category: { type: 'string' },
                  scope: { type: 'string' },
                  website: { type: 'string' },
                  location: { type: 'string' },
                  focus_areas: { type: 'array', items: { type: 'string' } }
                }
              }
            }
          }
        }
      });

      setCharities(response.charities || []);
      toast.success('Found charities in your area and globally');
    } catch (error) {
      toast.error('Failed to discover charities: ' + error.message);
    } finally {
      setDiscovering(false);
    }
  };

  const filteredCharities = charities.filter(charity => {
    const matchesSearch = charity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         charity.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || charity.category === selectedCategory;
    const matchesLocation = locationFilter === 'all' || 
                           (locationFilter === 'local' && charity.scope === 'Local') ||
                           (locationFilter === 'international' && charity.scope === 'International');
    
    return matchesSearch && matchesCategory && matchesLocation;
  });

  const saveMutation = useMutation({
    mutationFn: (charityData) => base44.entities.CharitableGiving.create({
      type: 'sadaqah',
      recipient: charityData.name,
      category: charityData.category.toLowerCase(),
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      notes: `Interested in: ${charityData.description}`
    }),
    onSuccess: () => {
      toast.success('Added to your charity list');
      queryClient.invalidateQueries({ queryKey: ['charitableGiving'] });
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-600" />
            Discover Islamic Charities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {charities.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                Find Charities to Support
              </h3>
              <p className="text-slate-600 mb-6">
                Discover reputable Islamic charities and humanitarian organizations
              </p>
              <Button
                onClick={discoverCharities}
                disabled={discovering}
                className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700"
              >
                {discovering ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Discovering...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Discover Charities
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              {/* Search and Filters */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search charities..."
                    className="pl-10"
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2">
                  {CHARITY_CATEGORIES.map(cat => (
                    <Button
                      key={cat}
                      size="sm"
                      variant={selectedCategory === cat ? 'default' : 'outline'}
                      onClick={() => setSelectedCategory(cat)}
                      className={selectedCategory === cat ? 'bg-rose-600' : ''}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={locationFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setLocationFilter('all')}
                    className={locationFilter === 'all' ? 'bg-teal-600' : ''}
                  >
                    <Globe className="w-4 h-4 mr-1" />
                    All
                  </Button>
                  <Button
                    size="sm"
                    variant={locationFilter === 'local' ? 'default' : 'outline'}
                    onClick={() => setLocationFilter('local')}
                    className={locationFilter === 'local' ? 'bg-teal-600' : ''}
                  >
                    <MapPin className="w-4 h-4 mr-1" />
                    Local
                  </Button>
                  <Button
                    size="sm"
                    variant={locationFilter === 'international' ? 'default' : 'outline'}
                    onClick={() => setLocationFilter('international')}
                    className={locationFilter === 'international' ? 'bg-teal-600' : ''}
                  >
                    <Globe className="w-4 h-4 mr-1" />
                    International
                  </Button>
                </div>
              </div>

              {/* Charities List */}
              <div className="space-y-3">
                {filteredCharities.map((charity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="border-2 hover:border-rose-200 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-slate-800 text-lg mb-1">
                              {charity.name}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                              <MapPin className="w-3 h-3" />
                              <span>{charity.location}</span>
                              <Badge variant="outline" className="text-xs">
                                {charity.scope}
                              </Badge>
                            </div>
                          </div>
                          <Badge className="bg-rose-100 text-rose-700 border-rose-300">
                            {charity.category}
                          </Badge>
                        </div>

                        <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                          {charity.description}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-3">
                          {charity.focus_areas.map((area, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(charity.website, '_blank')}
                            className="flex-1"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Visit Website
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => saveMutation.mutate(charity)}
                            className="flex-1 bg-rose-600 hover:bg-rose-700"
                          >
                            <Heart className="w-3 h-3 mr-1" />
                            Save
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}

                {filteredCharities.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-slate-500">No charities match your filters</p>
                  </div>
                )}
              </div>

              <Button
                onClick={discoverCharities}
                variant="outline"
                className="w-full"
              >
                Refresh List
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}