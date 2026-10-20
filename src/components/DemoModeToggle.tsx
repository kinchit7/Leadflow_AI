/**
 * Demo Mode Toggle Component
 * Allows authorized business administrators to start/reset isolated demo data.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AlertCircle, Play, RotateCcw } from 'lucide-react';
import { seedDemoTenant, resetDemoTenant } from '@/backend/demo-seed.web';
import { useBackendService } from '@/hooks/useBackendService';

export default function DemoModeToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const { executeWithAuth } = useBackendService();

  const handleStartDemo = async () => {
    setIsLoading(true);
    setMessage('');
    setIsSuccess(false);
    try {
      const result = await executeWithAuth((auth) => seedDemoTenant(auth));
      if (!result) {
        throw new Error('Could not resolve an authorized business context. Sign in with an owner/admin account and try again.');
      }
      if (result.created === 0 && result.skipped === 0) {
        throw new Error('Demo initialization was denied. Only an authorized owner/admin can initialize demo data.');
      }
      setIsSuccess(true);
      setMessage(result.skipped > 0
        ? 'Demo data already exists; no duplicate records were created.'
        : `Demo data initialized: ${result.created} records created.`);
      if (result.created > 0) {
        window.setTimeout(() => window.location.reload(), 1200);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to start demo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDemo = async () => {
    if (!confirm('Are you sure you want to reset all demo data? This cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    setMessage('');
    setIsSuccess(false);
    try {
      const result = await executeWithAuth((auth) => resetDemoTenant(auth));
      if (!result) {
        throw new Error('Could not resolve an authorized business context. Sign in with an owner/admin account and try again.');
      }
      if (result.deleted === 0) {
        setIsSuccess(true);
        setMessage('No demo records were found to delete.');
      } else {
        setIsSuccess(true);
        setMessage(`Demo data reset: ${result.deleted} records deleted.`);
        window.setTimeout(() => window.location.reload(), 1200);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to reset demo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs" title="Demo Mode Controls">
          Demo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Demo Mode</DialogTitle>
          <DialogDescription className="font-paragraph">
            Initialize or reset demo data for testing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {message && (
            <div className={`p-3 rounded-md flex items-start gap-3 ${
              isSuccess ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
            }`}>
              <AlertCircle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                isSuccess ? 'text-emerald-600' : 'text-red-600'
              }`} />
              <p className={`text-sm font-paragraph ${
                isSuccess ? 'text-emerald-800' : 'text-red-800'
              }`}>{message}</p>
            </div>
          )}

          <div className="space-y-3">
            <Button onClick={handleStartDemo} disabled={isLoading} className="w-full">
              <Play className="h-4 w-4 mr-2" />
              {isLoading ? 'Starting...' : 'Start Demo'}
            </Button>
            <Button onClick={handleResetDemo} disabled={isLoading} variant="outline" className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              {isLoading ? 'Resetting...' : 'Reset Demo'}
            </Button>
          </div>

          <p className="text-xs text-muted-grey-foreground font-paragraph">
            Demo operations require an authorized owner/admin context. Demo records are flagged and isolated from normal production records.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
