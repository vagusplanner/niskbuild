import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import FileAttachment, { FilePreview } from '../chat/FileAttachment';
import { FileText, Plus } from 'lucide-react';

export default function EventFileManager({ eventId }) {
  const [showUpload, setShowUpload] = useState(false);

  const { data: files = [], refetch } = useQuery({
    queryKey: ['event-files', eventId],
    queryFn: () => SDK.entities.SharedFile.filter({ shared_in_event: eventId }),
    enabled: !!eventId
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Attached Documents
          </CardTitle>
          <FileAttachment 
            eventId={eventId} 
            onFileShared={() => {
              refetch();
              setShowUpload(false);
            }}
          />
        </div>
      </CardHeader>
      <CardContent>
        {files.length > 0 ? (
          <div className="space-y-2">
            {files.map(file => (
              <FilePreview key={file.id} file={file} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600 mb-3">No documents attached</p>
            <p className="text-xs text-slate-500">
              Click the paperclip icon to attach files from Google Drive
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}