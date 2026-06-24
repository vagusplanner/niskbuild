import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FolderOpen, Search, File, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function GoogleDriveFilePicker({ entityType, entityId, onFileAttached }) {
  const [isOpen, setIsOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const queryClient = useQueryClient();

  const attachMutation = useMutation({
    mutationFn: async () => {
      // Extract file ID from Google Drive URL
      const fileIdMatch = fileUrl.match(/[-\w]{25,}/);
      if (!fileIdMatch) {
        throw new Error('Invalid Google Drive URL');
      }

      const { data } = await base44.functions.invoke('attachDriveFile', {
        fileId: fileIdMatch[0],
        entityType,
        entityId
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success('File attached successfully!');
      queryClient.invalidateQueries({ queryKey: ['sharedFiles'] });
      setIsOpen(false);
      setFileUrl('');
      onFileAttached?.(data.file);
    },
    onError: (error) => {
      toast.error('Failed to attach file');
      console.error('Attach error:', error);
    }
  });

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <FolderOpen className="w-4 h-4" />
        Attach from Drive
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach Google Drive File</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Google Drive File URL
              </label>
              <div className="flex gap-2">
                <Input
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Paste the shareable link to any file in your Google Drive
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex gap-2">
                <File className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  <p className="font-semibold mb-1">How to get the link:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Open the file in Google Drive</li>
                    <li>Click Share → Copy link</li>
                    <li>Paste the link here</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={attachMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => attachMutation.mutate()}
                disabled={!fileUrl.trim() || attachMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {attachMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Attaching...
                  </>
                ) : (
                  'Attach File'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}