import React, { useState, useEffect } from 'react';
import { offlineStorage } from './offlineStorage';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

export default function ConflictResolver() {
  const [conflicts, setConflicts] = useState([]);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [resolving, setResolving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadConflicts();
    
    const interval = setInterval(loadConflicts, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const loadConflicts = async () => {
    try {
      await offlineStorage.init();
      if (typeof offlineStorage.getUnresolvedConflicts !== 'function') {
        setConflicts([]);
        return;
      }
      const unresolvedConflicts = await offlineStorage.getUnresolvedConflicts().catch(() => []);
      setConflicts(unresolvedConflicts || []);
    } catch {
      // Silently ignore — IndexedDB conflicts store may not exist yet
      setConflicts([]);
    }
  };

  const resolveConflict = async (conflict, useLocal) => {
    setResolving(true);
    try {
      const dataToUse = useLocal ? conflict.local_data : conflict.server_data;
      
      // Update the entity with chosen version
      await base44.entities[conflict.entity].update(conflict.entity_id, dataToUse);
      
      // Mark conflict as resolved
      await offlineStorage.resolveConflict(conflict.id, useLocal ? 'local' : 'server');
      
      // Update offline cache
      if (conflict.entity === 'Event') {
        await offlineStorage.put('events', { ...dataToUse, offline_modified: false });
      } else if (conflict.entity === 'Task') {
        await offlineStorage.put('tasks', { ...dataToUse, offline_modified: false });
      }
      
      // Refresh UI
      queryClient.invalidateQueries();
      await loadConflicts();
      setSelectedConflict(null);
      
      toast.success('Conflict resolved');
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      toast.error('Failed to resolve conflict');
    } finally {
      setResolving(false);
    }
  };

  if (conflicts.length === 0) return null;

  return (
    <>
      {/* Conflict indicator */}
      <div className="fixed bottom-24 lg:bottom-6 right-4 z-40">
        <button
          onClick={() => setSelectedConflict(conflicts[0])}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-lg"
        >
          <AlertTriangle className="w-4 h-4" />
          <span className="font-medium">{conflicts.length} Conflict{conflicts.length > 1 ? 's' : ''}</span>
        </button>
      </div>

      {/* Conflict resolution dialog */}
      <Dialog open={!!selectedConflict} onOpenChange={(open) => !open && setSelectedConflict(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Resolve Sync Conflict
            </DialogTitle>
            <DialogDescription>
              This {selectedConflict?.entity.toLowerCase()} was modified both locally and on the server.
              Choose which version to keep.
            </DialogDescription>
          </DialogHeader>

          {selectedConflict && (
            <div className="space-y-6">
              {/* Local version */}
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <Badge className="bg-blue-600">Your Local Changes</Badge>
                  <span className="text-xs text-slate-500">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {new Date(selectedConflict.local_data.offline_updated_at || selectedConflict.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  {selectedConflict.entity === 'Event' && (
                    <>
                      <div><strong>Title:</strong> {selectedConflict.local_data.title}</div>
                      <div><strong>Start:</strong> {new Date(selectedConflict.local_data.start_date).toLocaleString()}</div>
                      <div><strong>End:</strong> {new Date(selectedConflict.local_data.end_date).toLocaleString()}</div>
                      {selectedConflict.local_data.description && (
                        <div><strong>Description:</strong> {selectedConflict.local_data.description}</div>
                      )}
                    </>
                  )}
                  {selectedConflict.entity === 'Task' && (
                    <>
                      <div><strong>Title:</strong> {selectedConflict.local_data.title}</div>
                      <div><strong>Status:</strong> {selectedConflict.local_data.status}</div>
                      <div><strong>Priority:</strong> {selectedConflict.local_data.priority}</div>
                      {selectedConflict.local_data.due_date && (
                        <div><strong>Due:</strong> {new Date(selectedConflict.local_data.due_date).toLocaleDateString()}</div>
                      )}
                    </>
                  )}
                </div>
                <Button
                  onClick={() => resolveConflict(selectedConflict, true)}
                  disabled={resolving}
                  className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Keep My Changes
                </Button>
              </div>

              {/* Server version */}
              <div className="p-4 bg-slate-50 border-2 border-slate-300 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline">Server Version</Badge>
                  <span className="text-xs text-slate-500">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {new Date(selectedConflict.server_data.updated_date).toLocaleString()}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  {selectedConflict.entity === 'Event' && (
                    <>
                      <div><strong>Title:</strong> {selectedConflict.server_data.title}</div>
                      <div><strong>Start:</strong> {new Date(selectedConflict.server_data.start_date).toLocaleString()}</div>
                      <div><strong>End:</strong> {new Date(selectedConflict.server_data.end_date).toLocaleString()}</div>
                      {selectedConflict.server_data.description && (
                        <div><strong>Description:</strong> {selectedConflict.server_data.description}</div>
                      )}
                    </>
                  )}
                  {selectedConflict.entity === 'Task' && (
                    <>
                      <div><strong>Title:</strong> {selectedConflict.server_data.title}</div>
                      <div><strong>Status:</strong> {selectedConflict.server_data.status}</div>
                      <div><strong>Priority:</strong> {selectedConflict.server_data.priority}</div>
                      {selectedConflict.server_data.due_date && (
                        <div><strong>Due:</strong> {new Date(selectedConflict.server_data.due_date).toLocaleDateString()}</div>
                      )}
                    </>
                  )}
                </div>
                <Button
                  onClick={() => resolveConflict(selectedConflict, false)}
                  disabled={resolving}
                  variant="outline"
                  className="w-full mt-3"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Keep Server Version
                </Button>
              </div>

              {/* Navigation */}
              {conflicts.length > 1 && (
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-sm text-slate-600">
                    Conflict {conflicts.indexOf(selectedConflict) + 1} of {conflicts.length}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentIndex = conflicts.indexOf(selectedConflict);
                        if (currentIndex > 0) {
                          setSelectedConflict(conflicts[currentIndex - 1]);
                        }
                      }}
                      disabled={conflicts.indexOf(selectedConflict) === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentIndex = conflicts.indexOf(selectedConflict);
                        if (currentIndex < conflicts.length - 1) {
                          setSelectedConflict(conflicts[currentIndex + 1]);
                        }
                      }}
                      disabled={conflicts.indexOf(selectedConflict) === conflicts.length - 1}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}