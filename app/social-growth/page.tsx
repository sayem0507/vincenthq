'use client';

import { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Users, Plus, Edit3, Trash2, Settings, Facebook, Youtube, Eye, ThumbsUp, MessageSquare, Share2, MousePointerClick, Clock, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/lib/context';
import { cn } from '@/lib/utils';

type SocialPost = {
  id: string;
  title: string;
  platform: 'Facebook' | 'YouTube';
  status: 'Draft' | 'Scheduled' | 'Posted';
  author: string;
  userId?: string;
  userName?: string;
  views?: number;
  impressions?: number;
  engagement?: string;
  likes?: number;
  reactions?: number;
  shares?: number;
  comments?: number;
  watchTime?: number;
  linkClicks?: number;
  createdAt?: string;
};

export default function SocialGrowthTracker() {
  const { socket, user } = useAppContext();
  const allPosts = (useAppContext().posts || []) as any[];
  const posts = allPosts.filter(p => p.platform === 'Facebook' || p.platform === 'YouTube') as SocialPost[];
  
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<'All' | 'Facebook' | 'YouTube'>('All');

  // Configurable Settings (Optional Features)
  const [showImpressions, setShowImpressions] = useState(true);
  const [showReactions, setShowReactions] = useState(false);
  const [showShares, setShowShares] = useState(true);
  const [showComments, setShowComments] = useState(true);
  const [showWatchTime, setShowWatchTime] = useState(false);
  const [showLinkClicks, setShowLinkClicks] = useState(false);

  // Form States
  const [formTitle, setFormTitle] = useState('');
  const [formPlatform, setFormPlatform] = useState<'Facebook' | 'YouTube'>('Facebook');
  const [formViews, setFormViews] = useState('');
  const [formImpressions, setFormImpressions] = useState('');
  const [formEngagement, setFormEngagement] = useState('');
  const [formLikes, setFormLikes] = useState('');
  const [formReactions, setFormReactions] = useState('');
  const [formShares, setFormShares] = useState('');
  const [formComments, setFormComments] = useState('');
  const [formWatchTime, setFormWatchTime] = useState('');
  const [formLinkClicks, setFormLinkClicks] = useState('');

  const filteredPosts = useMemo(() => {
    if (filterPlatform === 'All') return posts;
    return posts.filter(p => p.platform === filterPlatform);
  }, [posts, filterPlatform]);

  const stats = useMemo(() => {
    return filteredPosts.reduce((acc, p) => ({
      views: acc.views + (p.views || 0),
      impressions: acc.impressions + (p.impressions || 0),
      likes: acc.likes + (p.likes || 0),
      engagement: acc.engagement + parseFloat(p.engagement || '0'),
    }), { views: 0, impressions: 0, likes: 0, engagement: 0 });
  }, [filteredPosts]);

  const avgEngagement = filteredPosts.length > 0 ? (stats.engagement / filteredPosts.length).toFixed(2) + '%' : '0%';

  const handleOpenLogModal = (post?: SocialPost) => {
    if (post) {
      setEditingPost(post);
      setFormTitle(post.title || '');
      setFormPlatform(post.platform);
      setFormViews(post.views?.toString() || '');
      setFormImpressions(post.impressions?.toString() || '');
      setFormEngagement(post.engagement || '');
      setFormLikes(post.likes?.toString() || '');
      setFormReactions(post.reactions?.toString() || '');
      setFormShares(post.shares?.toString() || '');
      setFormComments(post.comments?.toString() || '');
      setFormWatchTime(post.watchTime?.toString() || '');
      setFormLinkClicks(post.linkClicks?.toString() || '');
    } else {
      setEditingPost(null);
      setFormTitle('');
      setFormPlatform('Facebook');
      setFormViews('');
      setFormImpressions('');
      setFormEngagement('');
      setFormLikes('');
      setFormReactions('');
      setFormShares('');
      setFormComments('');
      setFormWatchTime('');
      setFormLinkClicks('');
    }
    setIsLogModalOpen(true);
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !user) return;

    const postData = {
      id: editingPost ? editingPost.id : crypto.randomUUID(),
      title: formTitle,
      platform: formPlatform,
      status: 'Posted',
      author: user.name,
      userId: user.id,
      userName: user.name,
      views: parseInt(formViews) || 0,
      impressions: parseInt(formImpressions) || 0,
      engagement: formEngagement,
      likes: parseInt(formLikes) || 0,
      reactions: parseInt(formReactions) || 0,
      shares: parseInt(formShares) || 0,
      comments: parseInt(formComments) || 0,
      watchTime: parseInt(formWatchTime) || 0,
      linkClicks: parseInt(formLinkClicks) || 0,
      createdAt: editingPost ? editingPost.createdAt : new Date().toISOString(),
    };

    socket?.emit('update_post', postData);
    setIsLogModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setIsDeleting(id);
    socket?.emit('delete_post', id);
    setTimeout(() => setIsDeleting(null), 500);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Social Growth Tracker</h1>
          <p className="text-zinc-400 mt-1">Monitor your Facebook and YouTube performance precisely.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setIsSettingsModalOpen(true)} className="bg-[#2B2D31] border-white/10 hover:bg-[#383A40]">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button onClick={() => handleOpenLogModal()} className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20">
            <Plus className="w-4 h-4 mr-2" />
            Log Metrics
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#2B2D31] border border-white/5 rounded-xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Eye className="w-16 h-16 text-blue-400" />
          </div>
          <p className="text-sm font-medium text-zinc-400 mb-1">Total Views</p>
          <h3 className="text-3xl font-bold text-white">{stats.views.toLocaleString()}</h3>
        </div>
        
        <div className="bg-[#2B2D31] border border-white/5 rounded-xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="w-16 h-16 text-purple-400" />
          </div>
          <p className="text-sm font-medium text-zinc-400 mb-1">Total Impressions</p>
          <h3 className="text-3xl font-bold text-white">{stats.impressions.toLocaleString()}</h3>
        </div>

        <div className="bg-[#2B2D31] border border-white/5 rounded-xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ThumbsUp className="w-16 h-16 text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-zinc-400 mb-1">Total Likes</p>
          <h3 className="text-3xl font-bold text-white">{stats.likes.toLocaleString()}</h3>
        </div>

        <div className="bg-[#2B2D31] border border-white/5 rounded-xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-16 h-16 text-orange-400" />
          </div>
          <p className="text-sm font-medium text-zinc-400 mb-1">Avg Engagement</p>
          <h3 className="text-3xl font-bold text-white">{avgEngagement}</h3>
        </div>
      </div>

      {/* Filters & Content */}
      <div className="bg-[#2B2D31] border border-white/5 rounded-xl shadow-lg overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#1E1F22]/50">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilterPlatform('All')}
              className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-all", filterPlatform === 'All' ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5")}
            >
              All Platforms
            </button>
            <button
              onClick={() => setFilterPlatform('Facebook')}
              className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center", filterPlatform === 'Facebook' ? "bg-blue-500/20 text-blue-400" : "text-zinc-400 hover:text-white hover:bg-white/5")}
            >
              <Facebook className="w-4 h-4 mr-1.5" />
              Facebook
            </button>
            <button
              onClick={() => setFilterPlatform('YouTube')}
              className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center", filterPlatform === 'YouTube' ? "bg-red-500/20 text-red-400" : "text-zinc-400 hover:text-white hover:bg-white/5")}
            >
              <Youtube className="w-4 h-4 mr-1.5" />
              YouTube
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-zinc-500 bg-[#1E1F22]/30">
                <th className="p-4 font-medium">Content Title</th>
                <th className="p-4 font-medium">Platform</th>
                <th className="p-4 font-medium">Views</th>
                {showImpressions && <th className="p-4 font-medium">Impressions</th>}
                <th className="p-4 font-medium">Engagement</th>
                <th className="p-4 font-medium">Likes</th>
                {showReactions && <th className="p-4 font-medium">Reactions</th>}
                {showShares && <th className="p-4 font-medium">Shares</th>}
                {showComments && <th className="p-4 font-medium">Comments</th>}
                {showWatchTime && <th className="p-4 font-medium">Watch Time (m)</th>}
                {showLinkClicks && <th className="p-4 font-medium">Link Clicks</th>}
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence>
                {filteredPosts.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-zinc-500">
                      No posts logged yet. Click &quot;Log Metrics&quot; to add one.
                    </td>
                  </tr>
                ) : (
                  filteredPosts.map((post) => (
                    <motion.tr 
                      key={post.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="p-4">
                        <div className="font-medium text-white truncate max-w-[200px]">{post.title}</div>
                        <div className="text-xs text-zinc-500 mt-1">{new Date(post.createdAt || '').toLocaleDateString()}</div>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                          post.platform === 'Facebook' ? "bg-blue-500/10 text-blue-400" : "bg-red-500/10 text-red-400"
                        )}>
                          {post.platform === 'Facebook' ? <Facebook className="w-3 h-3 mr-1" /> : <Youtube className="w-3 h-3 mr-1" />}
                          {post.platform}
                        </span>
                      </td>
                      <td className="p-4 text-zinc-300 font-medium">{(post.views || 0).toLocaleString()}</td>
                      {showImpressions && <td className="p-4 text-zinc-400">{(post.impressions || 0).toLocaleString()}</td>}
                      <td className="p-4 text-emerald-400 font-medium">{post.engagement || '0%'}</td>
                      <td className="p-4 text-zinc-300">{(post.likes || 0).toLocaleString()}</td>
                      {showReactions && <td className="p-4 text-zinc-400">{(post.reactions || 0).toLocaleString()}</td>}
                      {showShares && <td className="p-4 text-zinc-400">{(post.shares || 0).toLocaleString()}</td>}
                      {showComments && <td className="p-4 text-zinc-400">{(post.comments || 0).toLocaleString()}</td>}
                      {showWatchTime && <td className="p-4 text-zinc-400">{(post.watchTime || 0).toLocaleString()}</td>}
                      {showLinkClicks && <td className="p-4 text-zinc-400">{(post.linkClicks || 0).toLocaleString()}</td>}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleOpenLogModal(post)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(post.id)} className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Metrics Modal */}
      <Modal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} title={editingPost ? "Edit Metrics" : "Log New Metrics"}>
        <form onSubmit={handleSavePost} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase">Content Title / URL</label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              className="w-full bg-[#1E1F22] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="e.g., My latest vlog..."
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase">Platform</label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setFormPlatform('Facebook')}
                className={cn("flex-1 py-2 rounded-lg border transition-all flex items-center justify-center", formPlatform === 'Facebook' ? "bg-blue-500/20 border-blue-500/50 text-blue-400" : "bg-[#1E1F22] border-white/10 text-zinc-400 hover:bg-white/5")}
              >
                <Facebook className="w-4 h-4 mr-2" /> Facebook
              </button>
              <button
                type="button"
                onClick={() => setFormPlatform('YouTube')}
                className={cn("flex-1 py-2 rounded-lg border transition-all flex items-center justify-center", formPlatform === 'YouTube' ? "bg-red-500/20 border-red-500/50 text-red-400" : "bg-[#1E1F22] border-white/10 text-zinc-400 hover:bg-white/5")}
              >
                <Youtube className="w-4 h-4 mr-2" /> YouTube
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase flex items-center"><Eye className="w-3 h-3 mr-1" /> Views</label>
              <input type="number" value={formViews} onChange={e => setFormViews(e.target.value)} className="w-full bg-[#1E1F22] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" placeholder="0" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase flex items-center"><TrendingUp className="w-3 h-3 mr-1" /> Engagement Rate</label>
              <input type="text" value={formEngagement} onChange={e => setFormEngagement(e.target.value)} className="w-full bg-[#1E1F22] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" placeholder="e.g., 5.2%" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase flex items-center"><ThumbsUp className="w-3 h-3 mr-1" /> Likes</label>
              <input type="number" value={formLikes} onChange={e => setFormLikes(e.target.value)} className="w-full bg-[#1E1F22] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" placeholder="0" />
            </div>
            {showImpressions && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase flex items-center"><Activity className="w-3 h-3 mr-1" /> Impressions</label>
                <input type="number" value={formImpressions} onChange={e => setFormImpressions(e.target.value)} className="w-full bg-[#1E1F22] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" placeholder="0" />
              </div>
            )}
            {showReactions && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase">Reactions</label>
                <input type="number" value={formReactions} onChange={e => setFormReactions(e.target.value)} className="w-full bg-[#1E1F22] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" placeholder="0" />
              </div>
            )}
            {showShares && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase flex items-center"><Share2 className="w-3 h-3 mr-1" /> Shares</label>
                <input type="number" value={formShares} onChange={e => setFormShares(e.target.value)} className="w-full bg-[#1E1F22] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" placeholder="0" />
              </div>
            )}
            {showComments && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase flex items-center"><MessageSquare className="w-3 h-3 mr-1" /> Comments</label>
                <input type="number" value={formComments} onChange={e => setFormComments(e.target.value)} className="w-full bg-[#1E1F22] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" placeholder="0" />
              </div>
            )}
            {showWatchTime && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase flex items-center"><Clock className="w-3 h-3 mr-1" /> Watch Time (m)</label>
                <input type="number" value={formWatchTime} onChange={e => setFormWatchTime(e.target.value)} className="w-full bg-[#1E1F22] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" placeholder="0" />
              </div>
            )}
            {showLinkClicks && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase flex items-center"><MousePointerClick className="w-3 h-3 mr-1" /> Link Clicks</label>
                <input type="number" value={formLinkClicks} onChange={e => setFormLinkClicks(e.target.value)} className="w-full bg-[#1E1F22] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" placeholder="0" />
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <Button type="button" variant="ghost" onClick={() => setIsLogModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white">Save Metrics</Button>
          </div>
        </form>
      </Modal>

      {/* Settings Modal */}
      <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="Tracker Settings">
        <div className="space-y-4">
          <p className="text-sm text-zinc-400 mb-4">Customize which metrics you want to track. Essential features (Views, Engagement, Likes) are always visible.</p>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-[#1E1F22] rounded-lg border border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
              <div>
                <div className="font-medium text-white">Track Impressions</div>
                <div className="text-xs text-zinc-500">How many times your content was shown</div>
              </div>
              <input type="checkbox" checked={showImpressions} onChange={e => setShowImpressions(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
            </label>
            
            <label className="flex items-center justify-between p-3 bg-[#1E1F22] rounded-lg border border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
              <div>
                <div className="font-medium text-white">Track Reactions</div>
                <div className="text-xs text-zinc-500">Facebook specific reactions (Love, Haha, etc.)</div>
              </div>
              <input type="checkbox" checked={showReactions} onChange={e => setShowReactions(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
            </label>

            <label className="flex items-center justify-between p-3 bg-[#1E1F22] rounded-lg border border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
              <div>
                <div className="font-medium text-white">Track Shares</div>
                <div className="text-xs text-zinc-500">How many times your content was shared</div>
              </div>
              <input type="checkbox" checked={showShares} onChange={e => setShowShares(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
            </label>

            <label className="flex items-center justify-between p-3 bg-[#1E1F22] rounded-lg border border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
              <div>
                <div className="font-medium text-white">Track Comments</div>
                <div className="text-xs text-zinc-500">Number of comments on your posts</div>
              </div>
              <input type="checkbox" checked={showComments} onChange={e => setShowComments(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
            </label>

            <label className="flex items-center justify-between p-3 bg-[#1E1F22] rounded-lg border border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
              <div>
                <div className="font-medium text-white">Track Watch Time</div>
                <div className="text-xs text-zinc-500">YouTube specific watch time in minutes</div>
              </div>
              <input type="checkbox" checked={showWatchTime} onChange={e => setShowWatchTime(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
            </label>

            <label className="flex items-center justify-between p-3 bg-[#1E1F22] rounded-lg border border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
              <div>
                <div className="font-medium text-white">Track Link Clicks</div>
                <div className="text-xs text-zinc-500">Clicks on links in your description/post</div>
              </div>
              <input type="checkbox" checked={showLinkClicks} onChange={e => setShowLinkClicks(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
            </label>
          </div>

          <div className="pt-4 flex justify-end">
            <Button onClick={() => setIsSettingsModalOpen(false)} className="bg-emerald-500 hover:bg-emerald-600 text-white">Done</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
