import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import UserAvatar from '@/components/shared/UserAvatar';

export default function ProfilePictureUploader({ user }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const queryClient = useQueryClient();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ photo_url: file_url });
      queryClient.invalidateQueries(['currentUser']);
      toast.success('Profile photo updated!');
    } catch (err) {
      toast.error('Upload failed. Please try again.');
    }
    setUploading(false);
  };

  const removePhoto = async () => {
    await base44.auth.updateMe({ photo_url: null });
    queryClient.invalidateQueries(['currentUser']);
    toast.success('Profile photo removed');
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <UserAvatar user={user} size="xl" />
        <button onClick={() => fileRef.current?.click()}
          className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-teal-500 hover:bg-teal-600 text-white flex items-center justify-center shadow-md transition-colors border-2 border-white dark:border-slate-900">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      <div>
        <p className="font-bold text-slate-800 dark:text-slate-100">{user?.full_name || 'Your Name'}</p>
        <p className="text-xs text-slate-400 mb-2">{user?.email}</p>
        <div className="flex gap-2">
          <button onClick={() => fileRef.current?.click()}
            className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium">
            {user?.photo_url ? 'Change photo' : 'Upload photo'}
          </button>
          {user?.photo_url && (
            <>
              <span className="text-slate-300">·</span>
              <button onClick={removePhoto} className="text-xs text-red-400 hover:underline font-medium">Remove</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}