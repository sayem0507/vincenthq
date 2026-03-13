'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <ShieldAlert className="w-16 h-16 text-red-500 mb-4 opacity-50" />
      <h2 className="text-3xl font-bold text-white mb-2">404 - Mission Not Found</h2>
      <p className="text-zinc-400 mb-8 max-w-md">
        The coordinates you provided do not match any known sector in the GrowthGrid.
      </p>
      <Link href="/">
        <Button>
          Return to Command Center
        </Button>
      </Link>
    </div>
  );
}
