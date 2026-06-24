import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { 
  FileText, 
  Upload, 
  Share2, 
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export function ShareEventToGoogleDrive({ event, onSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState(event?.title || 'Event Details');
  const [includeAttendees, setIncludeAttendees] = useState(true);
  const [folderPath, setFolderPath] = useState('MyAssistant Events');

  const handleShare = async () => {
    if (!fileName.trim()) {
      toast.error('Please enter a file name');
      return;
    }

    setIsLoading(true);
    try {
      const result = await base44.functions.invoke('shareEventToGoogleDrive', {
        event_id: event.id,
        event_data: {
          title: event.title,
          description: event.description,
          start_date: event.start_date,
          end_date: event.end_date,
          location: event.location,
          attendees: includeAttendees ? event.attendees : undefined
        },
        file_name: fileName,
        folder_path: folderPath
      });

      if (result.data.success) {
        toast.success('Event shared to Google Drive');
        setIsOpen(false);
        onSuccess?.();
      } else {
        toast.error(result.data.error || 'Failed to share to Google Drive');
      }
    } catch (error) {
      toast.error('Error sharing to Google Drive');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="w-4 h-4" />
          Share to Drive
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Event to Google Drive</DialogTitle>
          <DialogDescription>
            Save event details as a document in your Google Drive
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>File Name</Label>
            <Input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g., Q1 Planning Meeting"
            />
          </div>

          <div className="space-y-2">
            <Label>Folder Path (optional)</Label>
            <Input
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="e.g., MyAssistant Events"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div>
              <Label className="text-sm font-medium">Include Attendees</Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add attendee list to the document
              </p>
            </div>
            <Switch
              checked={includeAttendees}
              onCheckedChange={setIncludeAttendees}
            />
          </div>

          <Button
            onClick={handleShare}
            disabled={isLoading}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Share to Google Drive
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ShareEventToGoogleCalendar({ event, onSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncDescription, setSyncDescription] = useState(true);

  const handleSync = async () => {
    setIsLoading(true);
    try {
      const result = await base44.functions.invoke('shareEventToGoogleCalendar', {
        event_id: event.id,
        event_data: {
          title: event.title,
          description: syncDescription ? event.description : '',
          start_date: event.start_date,
          end_date: event.end_date,
          location: event.location
        }
      });

      if (result.data.success) {
        toast.success('Event synced to Google Calendar');
        setIsOpen(false);
        onSuccess?.();
      } else {
        toast.error(result.data.error || 'Failed to sync to Google Calendar');
      }
    } catch (error) {
      toast.error('Error syncing to Google Calendar');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="w-4 h-4" />
          Sync to Calendar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sync Event to Google Calendar</DialogTitle>
          <DialogDescription>
            Add this event to your Google Calendar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="bg-teal-50 dark:bg-teal-950 border-teal-200 dark:border-teal-800">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-1 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-teal-900 dark:text-teal-100">
                    {event?.title}
                  </p>
                  <p className="text-xs text-teal-700 dark:text-teal-200">
                    {event?.start_date}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div>
              <Label className="text-sm font-medium">Include Description</Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sync event details
              </p>
            </div>
            <Switch
              checked={syncDescription}
              onCheckedChange={setSyncDescription}
            />
          </div>

          <Button
            onClick={handleSync}
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 mr-2" />
                Sync to Google Calendar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}