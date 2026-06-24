import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, MapPin, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function RitualVisualAid({ ritualType }) {
  const [visualAids, setVisualAids] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);

  const fetchVisualAids = async () => {
    setLoading(true);
    try {
      const { data } = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate visual aids information for the Islamic ritual: ${ritualType}. Include recommended educational videos, diagrams, and step-by-step visual guides.
        
        Return JSON with:
        {
          "ritual": "${ritualType}",
          "diagrams": [
            {
              "title": "diagram title",
              "description": "what it shows",
              "steps": ["step 1", "step 2"]
            }
          ],
          "educational_videos": [
            {
              "title": "video title",
              "description": "brief description",
              "source": "YouTube/Vimeo/etc",
              "duration": "MM:SS",
              "quality": "high quality educational video",
              "link": "search keywords for finding on YouTube"
            }
          ],
          "visual_tips": [
            {
              "tip": "important visual pointer",
              "icon_description": "relevant emoji/icon"
            }
          ]
        }`,
        response_json_schema: {
          type: "object",
          properties: {
            diagrams: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  steps: { type: "array", items: { type: "string" } }
                }
              }
            },
            educational_videos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  source: { type: "string" },
                  duration: { type: "string" },
                  link: { type: "string" }
                }
              }
            },
            visual_tips: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  tip: { type: "string" },
                  icon_description: { type: "string" }
                }
              }
            }
          }
        },
        add_context_from_internet: true
      });
      setVisualAids(data);
    } catch (error) {
      toast.error('Failed to load visual aids');
    } finally {
      setLoading(false);
    }
  };

  if (!visualAids) {
    return (
      <Button
        onClick={fetchVisualAids}
        disabled={loading}
        variant="outline"
        className="border-blue-300 text-blue-700 hover:bg-blue-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading...
          </>
        ) : (
          <>
            📊 Show Visual Aids
          </>
        )}
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="space-y-4"
    >
      {/* Diagrams */}
      {visualAids.diagrams?.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              📐 Step-by-Step Diagrams
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {visualAids.diagrams.map((diagram, idx) => (
              <div key={idx} className="p-3 bg-white rounded border border-blue-200">
                <h4 className="font-semibold text-sm text-blue-900 mb-1">{diagram.title}</h4>
                <p className="text-xs text-blue-800 mb-2">{diagram.description}</p>
                {diagram.steps && (
                  <ol className="space-y-1">
                    {diagram.steps.map((step, stepIdx) => (
                      <li key={stepIdx} className="text-xs text-blue-700 ml-4 list-decimal">
                        {step}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Educational Videos */}
      {visualAids.educational_videos?.length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              🎥 Educational Videos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {visualAids.educational_videos.map((video, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="p-3 bg-white rounded border border-purple-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-purple-900">{video.title}</h4>
                    <p className="text-xs text-purple-700 mt-0.5">{video.description}</p>
                  </div>
                  <Badge className="bg-purple-600 text-xs flex-shrink-0">
                    {video.duration}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs mb-2">
                  <span className="px-2 py-1 rounded bg-purple-100 text-purple-700">
                    {video.source}
                  </span>
                  <span className="text-purple-600">⭐ High quality</span>
                </div>
                <Button
                  onClick={() => {
                    // Open YouTube search for the video
                    window.open(
                      `https://www.youtube.com/results?search_query=${encodeURIComponent(video.link)}`,
                      '_blank'
                    );
                  }}
                  size="sm"
                  variant="outline"
                  className="border-purple-300 text-purple-700 hover:bg-purple-100 text-xs h-7"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Watch on YouTube
                </Button>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Visual Tips */}
      {visualAids.visual_tips?.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              💡 Visual Tips & Pointers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {visualAids.visual_tips.map((tip, idx) => (
                <li key={idx} className="text-sm text-amber-900 flex items-start gap-2">
                  <span className="text-lg">{tip.icon_description}</span>
                  <span>{tip.tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}