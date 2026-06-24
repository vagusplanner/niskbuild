import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle,
  X,
  Cloud
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export function GoogleDriveUploader({ onUploadComplete, eventId }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        const result = await base44.functions.invoke('uploadToGoogleDrive', {
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          event_id: eventId
        });

        if (result.data.success) {
          setUploadedFiles(prev => [...prev, {
            id: result.data.file_id,
            name: file.name,
            link: result.data.web_link
          }]);
          toast.success(`${file.name} uploaded to Google Drive`);
        }
      }
      
      onUploadComplete?.();
    } catch (error) {
      toast.error('Failed to upload file');
      console.error(error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 border-2 border-dashed border-teal-200 dark:border-teal-800 hover:bg-teal-50/50 dark:hover:bg-teal-950/50 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          disabled={isUploading}
          className="hidden"
          accept="*/*"
        />
        
        <div
          className="flex flex-col items-center justify-center gap-4 cursor-pointer py-8"
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Uploading...</p>
            </>
          ) : (
            <>
              <Cloud className="w-8 h-8 text-teal-600" />
              <div className="text-center">
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  Upload to Google Drive
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Click or drag files to upload
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose Files
              </Button>
            </>
          )}
        </div>
      </Card>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Uploaded Files ({uploadedFiles.length})
          </p>
          {uploadedFiles.map(file => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <a
                  href={file.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-700 dark:text-green-300 hover:underline truncate"
                >
                  {file.name}
                </a>
              </div>
              <button
                onClick={() => handleRemoveFile(file.id)}
                className="p-1 hover:bg-green-100 dark:hover:bg-green-900 rounded transition-colors"
              >
                <X className="w-4 h-4 text-green-600" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}