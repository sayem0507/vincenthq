import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { Sidebar } from '@/components/sidebar';
import { AppProvider } from '@/lib/context';
import { AuthOverlay } from '@/components/auth-overlay';

export const metadata: Metadata = {
  title: 'GrowthGrid - Gamified Project Management',
  description: 'Gamified project management and growth software for teams.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#050505] text-slate-50 h-screen flex overflow-hidden relative" suppressHydrationWarning>
        <AppProvider>
          <AuthOverlay />
          {/* Atmospheric Background */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-600/10 blur-[120px]" />
            <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-purple-600/5 blur-[100px]" />
          </div>
          
          <div className="z-10 flex w-full h-full">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white/[0.02] to-transparent">
              {children}
            </main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
