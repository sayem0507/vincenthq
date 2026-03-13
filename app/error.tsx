'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4 opacity-50" />
      <h2 className="text-3xl font-bold text-white mb-2">System Malfunction</h2>
      <p className="text-zinc-400 mb-8 max-w-md">
        An unexpected error has occurred in the grid. Our engineers have been notified.
      </p>
      <Button onClick={() => reset()} variant="secondary">
        Attempt System Reboot
      </Button>
    </div>
  );
}
