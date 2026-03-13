'use client';

import { Trophy, Flame, TrendingUp, Users, Eye, DollarSign, Target, Zap, Award, Settings, MessageSquare, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { StatCard } from '@/components/ui/stat-card';
import { useAppContext } from '@/lib/context';
import { useMemo, useState, useRef } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const { user, users, leads, posts, settings, dailyUpdates, socket } = useAppContext();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editSettings, setEditSettings] = useState<Record<string, string>>({});
  
  const [newUpdateText, setNewUpdateText] = useState('');
  const [newUpdateImage, setNewUpdateImage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePostUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdateText.trim() && !newUpdateImage) return;
    
    socket?.emit('add_daily_update', {
      id: Date.now().toString(),
      userId: user?.id,
      userName: user?.name,
      text: newUpdateText,
      imageUrl: newUpdateImage
    });
    
    setNewUpdateText('');
    setNewUpdateImage('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewUpdateImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenSettings = () => {
    setEditSettings({
      goalRevenue: settings?.goalRevenue || '1000',
      viewsTarget: settings?.viewsTarget || '2400',
      telegramTarget: settings?.telegramTarget || '25',
      salesTarget: settings?.salesTarget || '1',
      daysRemaining: settings?.daysRemaining || '60',
    });
    setIsSettingsModalOpen(true);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    Object.entries(editSettings).forEach(([key, value]) => {
      socket?.emit('update_setting', { key, value });
    });
    setIsSettingsModalOpen(false);
  };

  const totalRevenue = leads.reduce((sum, l) => sum + (l.saleAmount || 0), 0);
  const views = posts.reduce((sum, p) => sum + (p.views || 0), 0);
  const telegramJoins = posts.reduce((sum, p) => sum + (p.telegramJoins || 0), 0);
  const sales = leads.filter(l => l.saleLogged).length;

  const statsData = {
    totalRevenue,
    views,
    telegramJoins,
    sales,
    goalRevenue: Number(settings?.goalRevenue || 1000),
    viewsTarget: Number(settings?.viewsTarget || 2400),
    telegramTarget: Number(settings?.telegramTarget || 25),
    salesTarget: Number(settings?.salesTarget || 1),
    daysRemaining: Number(settings?.daysRemaining || 60),
  };

  const progressPercentage = Math.min(100, (statsData.totalRevenue / statsData.goalRevenue) * 100);

  const realTimeMembers = useMemo(() => {
    return users.map(u => {
      const userSales = leads.filter(l => l.assignee === u.name && l.saleLogged === 1).length;
      const userPosts = posts.filter(p => p.author === u.name && p.status === 'published').length;
      
      let badges = [];
      if (u.role === 'admin') badges.push('Admin');
      if (u.xp > 1000) badges.push('Veteran');
      else if (u.xp > 500) badges.push('Rising Star');
      else badges.push('Novice');

      // Calculate efficiency: XP per sale/post (just a fun metric)
      const totalActions = userSales + userPosts;
      const efficiency = totalActions > 0 ? Math.round(u.xp / totalActions) : 0;

      return {
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        xp: u.xp,
        sales: userSales,
        posts: userPosts,
        efficiency,
        badges
      };
    }).sort((a, b) => b.xp - a.xp);
  }, [users, leads, posts]);

  const mostEfficientUser = useMemo(() => {
    if (realTimeMembers.length === 0) return null;
    return [...realTimeMembers].sort((a, b) => b.efficiency - a.efficiency)[0];
  }, [realTimeMembers]);

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto space-y-12">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 flex justify-between items-start"
      >
        <div>
          <h1 className="text-5xl font-extrabold tracking-tighter text-white mb-3">{settings?.section_dashboard || 'Command Center'}</h1>
          <p className="text-zinc-500 text-lg font-medium">Track your progress towards the ${statsData.goalRevenue.toLocaleString()} goal.</p>
        </div>
        {user?.role === 'admin' && (
          <Button onClick={handleOpenSettings} variant="secondary">
            <Settings className="w-4 h-4 mr-2" />
            Edit Targets
          </Button>
        )}
      </motion.header>

      {/* The Progress Bar */}
      <motion.section 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-10 relative overflow-hidden shadow-2xl"
      >
        <div className="relative z-10">
          <div className="flex justify-between items-end mb-8">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-3">Mission Progress</p>
              <h2 className="text-7xl font-extrabold text-white tracking-tighter">
                ${statsData.totalRevenue} <span className="text-3xl text-zinc-600 font-bold">/ ${statsData.goalRevenue}</span>
              </h2>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-zinc-800/50 border border-white/5 backdrop-blur-md">
                <span className="text-3xl font-black text-white mr-3">{statsData.daysRemaining}</span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Days Left</span>
              </div>
            </div>
          </div>
          
          <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 2, ease: "easeOut", delay: 0.5 }}
              className="h-full bg-emerald-500 rounded-full"
            />
          </div>
          <div className="flex justify-between mt-4 text-[10px] font-bold uppercase tracking-[0.1em]">
            <span className="text-zinc-600">Day 1</span>
            <span className="text-emerald-500">{progressPercentage.toFixed(1)}% Complete</span>
          </div>
        </div>
      </motion.section>

      {/* Daily Vital Signs */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-[0.2em] mb-6 flex items-center">
          <TrendingUp className="w-4 h-4 mr-2 text-blue-500" />
          Daily Vital Signs
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StatCard 
            title="Total Views" 
            value={statsData.views.toLocaleString()} 
            target={statsData.viewsTarget.toLocaleString()} 
            icon={Eye} 
            color="blue"
            delay={0.3}
          />
          <StatCard 
            title="New Telegram Joins" 
            value={statsData.telegramJoins.toString()} 
            target={statsData.telegramTarget.toString()} 
            icon={Users} 
            color="purple"
            delay={0.4}
          />
          <StatCard 
            title="Sales Closed" 
            value={statsData.sales.toString()} 
            target={statsData.salesTarget.toString()} 
            icon={DollarSign} 
            color="green"
            delay={0.5}
          />
        </div>
      </motion.section>

      {/* The Arena (Leaderboard) */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center">
            <Trophy className="w-4 h-4 mr-2 text-yellow-500" />
            {settings?.section_arena || 'The Arena'}
          </h3>
          
          {mostEfficientUser && mostEfficientUser.efficiency > 0 && (
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-4 py-2 flex items-center">
              <Award className="w-4 h-4 text-emerald-500 mr-2" />
              <div className="text-xs font-bold">
                <span className="text-zinc-600 uppercase tracking-[0.1em]">Most Efficient: </span>
                <span className="text-white">{mostEfficientUser.name}</span>
                <span className="text-emerald-500 ml-2">({mostEfficientUser.efficiency} XP/action)</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
          <div className="divide-y divide-white/5">
            {realTimeMembers.map((member, index) => (
              <motion.div 
                key={member.id} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="p-8 flex flex-col md:flex-row md:items-center hover:bg-white/[0.02] transition-colors duration-300 gap-6"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-16 text-center">
                    <span className={`text-4xl font-black ${
                      index === 0 ? 'text-yellow-500' : 
                      index === 1 ? 'text-zinc-400' : 
                      index === 2 ? 'text-amber-700' : 'text-zinc-800'
                    }`}>
                      #{index + 1}
                    </span>
                  </div>
                  
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border border-white/5 mx-6 shadow-lg">
                    <Image src={member.avatar} alt={member.name} fill className="object-cover" referrerPolicy="no-referrer" />
                  </div>
                </div>
                
                <div className="flex-1">
                  <h4 className="text-2xl font-extrabold text-white tracking-tight flex items-center">
                    {member.name}
                    {index === 0 && <Flame className="w-5 h-5 ml-2 text-orange-500" />}
                  </h4>
                  <div className="flex flex-wrap items-center mt-3 gap-3">
                    {member.badges.map(badge => (
                      <span key={badge} className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.1em] bg-zinc-800 text-zinc-400 border border-white/5">
                        {badge}
                      </span>
                    ))}
                    {member.efficiency > 0 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.1em] bg-emerald-500/5 text-emerald-500 border border-emerald-500/10">
                        <Zap className="w-3 h-3 mr-1" />
                        {member.efficiency} XP/action
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="md:text-right mt-2 md:mt-0">
                  <div className="text-5xl font-extrabold text-white tracking-tighter">
                    {member.xp.toLocaleString()} <span className="text-sm font-bold text-zinc-600">XP</span>
                  </div>
                  <div className="text-xs font-bold text-zinc-600 uppercase tracking-[0.1em] mt-2">
                    {member.sales} Sales | {member.posts} Posts
                  </div>
                </div>
              </motion.div>
            ))}
            
            {realTimeMembers.length === 0 && (
              <div className="p-12 text-center text-zinc-600 font-bold uppercase tracking-[0.2em]">
                No users found in the arena.
              </div>
            )}
          </div>
        </div>
      </motion.section>

      {/* Daily Updates */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-[0.2em] mb-6 flex items-center">
          <MessageSquare className="w-4 h-4 mr-2 text-pink-500" />
          Daily Updates
        </h3>
        
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl mb-8">
          <form onSubmit={handlePostUpdate} className="space-y-4">
            <textarea 
              value={newUpdateText}
              onChange={(e) => setNewUpdateText(e.target.value)}
              placeholder="What's your update for today?"
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all min-h-[100px] resize-none"
            />
            {newUpdateImage && (
              <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-white/10">
                <Image src={newUpdateImage} alt="Upload preview" fill className="object-cover" />
                <button 
                  type="button"
                  onClick={() => setNewUpdateImage('')}
                  className="absolute top-1 right-1 bg-black/50 rounded-full p-1 text-white hover:bg-black/80"
                >
                  &times;
                </button>
              </div>
            )}
            <div className="flex justify-between items-center">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
              <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                <ImageIcon className="w-4 h-4 mr-2" />
                Add Photo
              </Button>
              <Button type="submit" disabled={!newUpdateText.trim() && !newUpdateImage}>
                Post Update
              </Button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          {dailyUpdates?.map((update: any) => (
            <motion.div 
              key={update.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6"
            >
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden relative mr-4">
                  <Image src={`https://i.pravatar.cc/150?u=${update.userId}`} alt={update.userName} fill className="object-cover" />
                </div>
                <div>
                  <h4 className="font-bold text-white">{update.userName}</h4>
                  <p className="text-xs text-zinc-500">{new Date(update.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <p className="text-zinc-300 whitespace-pre-wrap mb-4">{update.text}</p>
              {update.imageUrl && (
                <div className="relative w-full max-w-md h-64 rounded-xl overflow-hidden border border-white/10">
                  <Image src={update.imageUrl} alt="Update image" fill className="object-cover" />
                </div>
              )}
            </motion.div>
          ))}
          {(!dailyUpdates || dailyUpdates.length === 0) && (
            <div className="text-center text-zinc-600 font-bold uppercase tracking-[0.2em] py-12">
              No updates yet. Be the first to post!
            </div>
          )}
        </div>
      </motion.section>

      <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="Edit Targets">
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Revenue Goal ($)</label>
            <input 
              type="number" 
              value={editSettings.goalRevenue || ''}
              onChange={(e) => setEditSettings({...editSettings, goalRevenue: e.target.value})}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Views Target</label>
            <input 
              type="number" 
              value={editSettings.viewsTarget || ''}
              onChange={(e) => setEditSettings({...editSettings, viewsTarget: e.target.value})}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Telegram Joins Target</label>
            <input 
              type="number" 
              value={editSettings.telegramTarget || ''}
              onChange={(e) => setEditSettings({...editSettings, telegramTarget: e.target.value})}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Sales Target</label>
            <input 
              type="number" 
              value={editSettings.salesTarget || ''}
              onChange={(e) => setEditSettings({...editSettings, salesTarget: e.target.value})}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Days Remaining</label>
            <input 
              type="number" 
              value={editSettings.daysRemaining || ''}
              onChange={(e) => setEditSettings({...editSettings, daysRemaining: e.target.value})}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all" 
            />
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full">Save Targets</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
