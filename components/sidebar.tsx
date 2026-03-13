'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Calendar, Trophy, Target, Zap, CheckSquare, Bell, BellOff, LogOut, Settings, MessageSquare, CalendarDays, User as UserIcon, Camera, BarChart3, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { useAppContext } from '@/lib/context';
import Image from 'next/image';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, onlineUsers, settings, notificationsEnabled, setNotificationsEnabled, socket } = useAppContext();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Alex assigned you a new task: "Update API Endpoints"', time: '2m ago', unread: true },
    { id: 2, text: 'Jordan mentioned you in "Implement Auth"', time: '1h ago', unread: true },
    { id: 3, text: 'Deadline approaching: "Launch Campaign" is due tomorrow', time: '3h ago', unread: false },
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const navItems = [
    { name: settings?.section_dashboard || 'Command Center', href: '/', icon: LayoutDashboard },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: settings?.section_leads || 'Outreach CRM', href: '/leads', icon: Users },
    { name: 'Social Growth', href: '/social-growth', icon: Target },
    { name: settings?.section_content || 'Content Engine', href: '/content', icon: Calendar },
    { name: settings?.section_tasks || 'Tasks & Projects', href: '/tasks', icon: CheckSquare },
    { name: 'Calendar', href: '/calendar', icon: CalendarDays },
    { name: 'Team Chat', href: '/chat', icon: MessageSquare },
    { name: 'Team Feed', href: '/feed', icon: Users },
    { name: 'Knowledge Base', href: '/docs', icon: BookOpen },
    { name: 'Automations', href: '/automations', icon: Zap },
  ];

  return (
    <div className="flex h-full w-64 flex-col bg-zinc-950/80 backdrop-blur-2xl border-r border-white/5 z-20 relative shadow-2xl">
      <div className="flex h-16 items-center justify-between px-6 border-b border-white/5 bg-black/20">
        <div className="flex items-center">
          <svg viewBox="0 0 24 24" className="h-7 w-7 mr-2 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" fill="none">
            <defs>
              <linearGradient id="logoGradient" x1="0" y1="0" x2="0" y2="24">
                <stop offset="0%" stopColor="#FACC15" />
                <stop offset="100%" stopColor="#EAB308" />
              </linearGradient>
            </defs>
            <path d="M12 10L6 4H18L12 10ZM12 18L6 12H18L12 18Z" fill="url(#logoGradient)" />
          </svg>
          <span className="text-xl font-bold tracking-tight text-white">
            {settings?.software_name || 'GrowthGrid'}
          </span>
        </div>
        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {showNotifications && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-16 left-full ml-2 w-80 bg-white/[0.05] backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
              <h3 className="font-bold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-sm">No notifications</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map(notif => (
                    <div key={notif.id} className={`p-4 transition-colors hover:bg-white/5 ${notif.unread ? 'bg-blue-500/5' : ''}`}>
                      <p className={`text-sm ${notif.unread ? 'text-white font-medium' : 'text-zinc-400'}`}>
                        {notif.text}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">{notif.time}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="flex-1 space-y-2 px-4 py-6 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300',
                isActive
                  ? 'bg-blue-500/10 text-blue-400 shadow-[inset_0_1px_1px_rgba(59,130,246,0.2)] border border-blue-500/20'
                  : 'text-zinc-400 hover:bg-white/[0.06] hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-300',
                  isActive ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'text-zinc-500 group-hover:text-zinc-300'
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}

        {user?.role === 'admin' && (
          <Link
            href="/admin"
            className={cn(
              'group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 mt-4 border border-purple-500/20',
              pathname === '/admin'
                ? 'bg-purple-500/10 text-purple-400 shadow-[inset_0_1px_1px_rgba(168,85,247,0.1)]'
                : 'text-zinc-400 hover:bg-purple-500/5 hover:text-purple-300'
            )}
          >
            <Settings
              className={cn(
                'mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-300',
                pathname === '/admin' ? 'text-purple-400' : 'text-zinc-500 group-hover:text-purple-400'
              )}
              aria-hidden="true"
            />
            Admin Panel
          </Link>
        )}

        {/* Notifications Toggle */}
        <div className="mt-8 pt-6 border-t border-white/5 px-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center">
              {notificationsEnabled ? <Bell className="w-3.5 h-3.5 mr-2 text-blue-400" /> : <BellOff className="w-3.5 h-3.5 mr-2 text-zinc-500" />}
              Popups
            </span>
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-black",
                notificationsEnabled ? "bg-blue-500" : "bg-zinc-700"
              )}
            >
              <span
                className={cn(
                  "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                  notificationsEnabled ? "translate-x-5" : "translate-x-1"
                )}
              />
            </button>
          </div>
        </div>

        {/* Online Users Section */}
        <div className="mt-8 pt-6 border-t border-white/5">
          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 px-3 flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
            Online Now ({onlineUsers.length})
          </h4>
          <div className="space-y-1">
            {onlineUsers.map((ou) => (
              <div key={ou.id} className="flex items-center px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <div className="relative w-6 h-6 rounded-full overflow-hidden mr-2">
                  <Image src={ou.avatar} alt={ou.name} fill className="object-cover" referrerPolicy="no-referrer" />
                </div>
                <span className="text-sm text-zinc-300 truncate">{ou.name}</span>
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-white/10 bg-black/20">
        {user ? (
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center min-w-0 cursor-pointer hover:bg-white/5 p-1 -ml-1 rounded-lg transition-colors"
              onClick={() => {
                setNewAvatarUrl(user.avatar);
                setIsProfileModalOpen(true);
              }}
            >
              <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/10 mr-3 shrink-0 group">
                <Image src={user.avatar} alt={user.name} fill className="object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{user.name}</p>
                <p className="text-xs text-blue-400 font-medium truncate">{user.xp} XP</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-center text-sm text-zinc-500">Not logged in</div>
        )}
      </div>

      <Modal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title="Edit Profile">
        <div className="space-y-6">
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white/10 mb-4">
              <Image src={newAvatarUrl || user?.avatar || ''} alt="Avatar preview" fill className="object-cover" referrerPolicy="no-referrer" />
            </div>
            <p className="text-xs text-zinc-500 mb-2">Preview</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Avatar URL</label>
            <input 
              type="text" 
              value={newAvatarUrl}
              onChange={(e) => setNewAvatarUrl(e.target.value)}
              placeholder="https://example.com/image.jpg" 
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-zinc-600" 
            />
            <p className="text-xs text-zinc-500 mt-2">Enter a direct link to an image to update your profile picture.</p>
          </div>
          <div className="flex space-x-3 justify-end pt-4 border-t border-white/10">
            <Button variant="secondary" onClick={() => setIsProfileModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (user && newAvatarUrl) {
                  socket?.emit('update_user_avatar', { userId: user.id, avatar: newAvatarUrl });
                  setIsProfileModalOpen(false);
                }
              }}
              className="bg-purple-600 hover:bg-purple-500 text-white"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
