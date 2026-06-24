import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function Islam() {
  return (
    <div className="space-y-6">
      <div className="forge-block p-6">
        <h1 className="font-display text-3xl forge-copper-text">Islam</h1>
        <p className="text-forge-copper-cream/60 mt-2">Forged with iron discipline and copper warmth.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Islam Workspace</CardTitle>
          <CardDescription>Your islam tools live here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-forge-copper-cream/70 text-sm">Content loads from your connected modules.</p>
        </CardContent>
      </Card>
    </div>
  );
}
