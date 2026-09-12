import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import UserAvatar from '@/components/shared/UserAvatar';

/**
 * Single Account → Personal Info photo control.
 * Upload goes to private `uploads` bucket; we persist the durable storage path
 * in auth user_metadata (via updateMe → { data: … }). Display URLs are
 * re-signed in base44.auth.me() — never toast success on a silent metadata no-op.
 */
export default function ProfilePictureUploader({ user }) {
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState(null);
  const fileRef = useRef(null);
  const queryClient = useQueryClient();

  const displayUser = localPreview
    ? { ...user, photo_url: localPreview, profile_picture: localPreview }
    : user;

  const clearLocalPreview = () => {
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }

    setUploading(true);
    clearLocalPreview();
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);

    try {
      const uploaded = await base44.integrations.Core.UploadFile({ file });
      const storagePath = uploaded?.storage_path;
      const fileUrl = uploaded?.file_url;
      if (!storagePath && !fileUrl) {
        throw new Error('Upload returned no path or URL');
      }

      // Persist durable path (+ short-lived URL as fallback for immediate paint).
      // updateMe wraps this into supabase.auth.updateUser({ data: … }).
      await base44.auth.updateMe({
        photo_storage_path: storagePath || null,
        avatar_storage_path: storagePath || null,
        photo_url: fileUrl || null,
        avatar_url: fileUrl || null,
        profile_picture: fileUrl || null,
      });

      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      clearLocalPreview();
      toast.success('Profile photo updated!');
    } catch (err) {
      console.error('Profile photo upload failed:', err);
      clearLocalPreview();
      toast.error(err?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    setUploading(true);
    try {
      await base44.auth.updateMe({
        photo_storage_path: null,
        avatar_storage_path: null,
        photo_url: null,
        avatar_url: null,
        profile_picture: null,
      });
      clearLocalPreview();
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Profile photo removed');
    } catch (err) {
      console.error('Profile photo remove failed:', err);
      toast.error(err?.message || 'Could not remove photo');
    } finally {
      setUploading(false);
    }
  };

  const hasPhoto = !!(
    displayUser?.photo_url ||
    displayUser?.profile_picture ||
    displayUser?.photo_storage_path
  );

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <UserAvatar user={displayUser} size="xl" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-teal-500 hover:bg-teal-600 text-white flex items-center justify-center shadow-md transition-colors border-2 border-white dark:border-slate-900 disabled:opacity-60"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      <div>
        <p className="font-bold text-slate-800 dark:text-slate-100">{user?.full_name || 'Your Name'}</p>
        <p className="text-xs text-slate-400 mb-2">{user?.email}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium disabled:opacity-60"
          >
            {hasPhoto ? 'Change photo' : 'Upload photo'}
          </button>
          {hasPhoto && (
            <>
              <span className="text-slate-300">·</span>
              <button
                type="button"
                onClick={removePhoto}
                disabled={uploading}
                className="text-xs text-red-400 hover:underline font-medium disabled:opacity-60"
              >
                Remove
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
