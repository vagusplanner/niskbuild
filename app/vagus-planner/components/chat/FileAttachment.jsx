import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { 
  Paperclip, Upload, FileText, Image as ImageIcon, 
  File, X, Loader2, ExternalLink 
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function FileAttachment({ chatId, eventId, onFileShared }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const handleFileSelect = async (event, provider = 'google_drive') => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);
      if (chatId) formData.append('chatId', chatId);
      if (eventId) formData.append('eventId', eventId);

      const response = await base44.functions.invoke('uploadToGoogleDrive', formData);
      
      if (response.data.success) {
        toast.success(`File uploaded to ${provider === 'google_drive' ? 'Google Drive' : 'Local'}`);
        onFileShared && onFileShared(response.data.file);
      }
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Upload to Google Drive
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {
            window.open('https://drive.google.com/drive/my-drive', '_blank');
          }}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Browse Google Drive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
      <div className="p-2 bg-white rounded-lg">
        <Icon className="w-5 h-5 text-slate-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-slate-800 truncate">{file.file_name}</p>
        <p className="text-xs text-slate-500">
          {file.storage_provider === 'google_drive' ? 'Google Drive' : 'Local'} • 
          {file.file_size ? ` ${(file.file_size / 1024).toFixed(1)} KB` : ''}
        </p>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => window.open(file.file_url, '_blank')}
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