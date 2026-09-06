import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { 
  Paperclip, FileText, Image as ImageIcon, 
  File, X, Loader2, ExternalLink 
} from 'lucide-react';
import { toast } from 'sonner';

function isNonEmptyId(value) {
  return value != null && String(value).trim() !== '';
}

export default function FileAttachment({ chatId, eventId, onFileShared }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Event attachments must be linked to a real event id — never toast success for orphans.
    if (!isNonEmptyId(eventId) && !isNonEmptyId(chatId)) {
      toast.error('Save the event first, then attach a file');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    let uploadedPath = null;
    try {
      const uploaded = await base44.integrations.Core.UploadFile(file);
      uploadedPath = uploaded?.storage_path || uploaded?.path || null;
      if (!uploadedPath) {
        throw new Error('Upload did not return a storage path');
      }
      if (!uploaded?.file_url) {
        throw new Error('Upload did not return a file URL');
      }

      const record = await base44.entities.SharedFile.create({
        event_id: isNonEmptyId(eventId) ? String(eventId).trim() : null,
        chat_id: isNonEmptyId(chatId) ? String(chatId).trim() : null,
        shared_in_event: isNonEmptyId(eventId) ? String(eventId).trim() : null,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: uploadedPath,
        file_url: uploaded.file_url,
        storage_provider: 'supabase',
      });

      // Success only after a real persisted row linked to this event/chat.
      if (!record?.id) {
        throw new Error('Attachment record was not saved');
      }
      if (isNonEmptyId(eventId)) {
        const linked = record.event_id ?? record.shared_in_event;
        if (String(linked || '') !== String(eventId).trim()) {
          throw new Error('File uploaded but was not linked to this event');
        }
      }

      toast.success('File attached');
      onFileShared?.(record);
    } catch (error) {
      console.error('File attachment failed:', error);
      toast.error(error?.message || 'Failed to upload file');
      // Best-effort cleanup of orphaned storage object if DB link failed.
      if (uploadedPath) {
        try {
          await base44.storage.from('uploads').remove([uploadedPath]);
        } catch (cleanupErr) {
          console.warn('Could not clean up uploaded file after failed attach:', cleanupErr);
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Direct file picker — avoids DropdownMenu z-50 opening under EventForm (z-110).
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 relative z-10"
        disabled={uploading}
        title="Attach a file"
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Paperclip className="w-5 h-5" />
        )}
      </Button>
    </>
  );
}

export function FilePreview({ file, onRemove }) {
  const getFileIcon = () => {
    if (file.file_type?.startsWith('image/')) return ImageIcon;
    if (file.file_type?.includes('pdf')) return FileText;
    return File;
  };

  const Icon = getFileIcon();

  const openFile = async () => {
    try {
      if (file.storage_path) {
        const { data, error } = await base44.storage.from('uploads').createSignedUrl(file.storage_path, 3600);
        if (error) throw error;
        const url = data?.signedUrl;
        if (url) {
          window.open(url, '_blank');
          return;
        }
      }
      if (file.file_url) window.open(file.file_url, '_blank');
    } catch (err) {
      toast.error('Could not open file');
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
      <div className="p-2 bg-white rounded-lg">
        <Icon className="w-5 h-5 text-slate-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-slate-800 truncate">{file.file_name}</p>
        <p className="text-xs text-slate-500">
          {file.storage_provider === 'google_drive' ? 'Google Drive' : 'Uploaded'}
          {file.file_size ? ` • ${(file.file_size / 1024).toFixed(1)} KB` : ''}
        </p>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={openFile}
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
