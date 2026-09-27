/**
 * Demo Mode Toggle Component
 * Allows users to start/reset demo data for testing
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

export default function DemoModeToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleStartDemo = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const result = await seedDemoTenant();
      setIsSuccess(true);
      setMessage(`Demo data initialized: ${result.created} records created`);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setIsSuccess(false);
      setMessage(error instanceof Error ? error.message : 'Failed to start demo');
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
    try {
      const result = await resetDemoTenant();
      setIsSuccess(true);
      setMessage(`Demo data reset: ${result.deleted} records deleted`);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setIsSuccess(false);
      setMessage(error instanceof Error ? error.message : 'Failed to reset demo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          title="Demo Mode Controls"
        >
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
            <div
              className={`p-3 rounded-md flex items-start gap-3 ${
                isSuccess
                  ? 'bg-emerald-50 border border-emerald-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <AlertCircle
                className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                  isSuccess ? 'text-emerald-600' : 'text-red-600'
                }`}
              />
              <p
                className={`text-sm font-paragraph ${
                  isSuccess ? 'text-emerald-800' : 'text-red-800'
                }`}
              >
                {message}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleStartDemo}
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Play className="h-4 w-4 mr-2" />
              {isLoading ? 'Starting...' : 'Start Demo'}
            </Button>

            <Button
              onClick={handleResetDemo}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {isLoading ? 'Resetting...' : 'Reset Demo'}
            </Button>
          </div>

          <p className="text-xs text-muted-grey-foreground font-paragraph">
            Demo mode creates isolated test data that won't affect production. Use this to explore features safely.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
