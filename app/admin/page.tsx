'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Users, Trash2, Edit, Search, Plus, X, Settings, AlertTriangle, Save } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import Image from 'next/image';

export default function AdminPanel() {
  const { user, users, socket, settings } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<'users' | 'customization' | 'danger'>('users');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');

  const [userToAddXP, setUserToAddXP] = useState<string | null>(null);
  const [xpAmount, setXpAmount] = useState('');

  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings) {
      const timer = setTimeout(() => {
        setLocalSettings(settings);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [settings]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="p-8 h-full flex flex-col items-center justify-center text-center">
        <Shield className="w-16 h-16 text-red-500 mb-4 opacity-50" />
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-zinc-400">You do not have permission to view this page.</p>
      </div>
    );
  }

  const handleDeleteUser = () => {
    if (userToDelete) {
      socket?.emit('delete_user', userToDelete);
      setUserToDelete(null);
    }
  };

  const handleRoleChange = (id: string, newRole: string) => {
    socket?.emit('update_user_role', { userId: id, role: newRole });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    socket?.emit('create_user', {
      name: newUserName,
      email: newUserEmail,
      password: newUserPassword,
      role: newUserRole
    });
    setIsCreateModalOpen(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserRole('user');
  };

  const handleAddXP = (e: React.FormEvent) => {
    e.preventDefault();
    if (userToAddXP && xpAmount && !isNaN(Number(xpAmount))) {
      socket?.emit('update_user_xp', { userId: userToAddXP, xpToAdd: Number(xpAmount) });
      setUserToAddXP(null);
      setXpAmount('');
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    Object.entries(localSettings).forEach(([key, value]) => {
      if (settings[key] !== value) {
        socket?.emit('update_setting', { key, value });
      }
    });
    alert('Settings saved successfully!');
  };

  const handleClearData = (type: 'tasks' | 'leads' | 'posts') => {
    if (confirm(`Are you absolutely sure you want to delete all ${type}? This action CANNOT be undone.`)) {
      socket?.emit('clear_all_data', type);
      alert(`All ${type} have been deleted.`);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col relative overflow-y-auto">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center">
            <Shield className="w-8 h-8 mr-3 text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
            Admin Control Panel
          </h1>
          <p className="text-zinc-400">Manage users, roles, and system settings.</p>
        </div>
        {activeTab === 'users' && (
          <div className="flex items-center space-x-3">
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </div>
        )}
      </motion.header>

      <div className="flex space-x-4 mb-6 border-b border-white/10 pb-2">
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'users' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
        >
          <Users className="w-4 h-4 inline-block mr-2" />
          User Management
        </button>
        <button 
          onClick={() => setActiveTab('customization')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'customization' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
        >
          <Settings className="w-4 h-4 inline-block mr-2" />
          Customization
        </button>
        <button 
          onClick={() => setActiveTab('danger')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'danger' ? 'bg-red-500/20 text-red-400' : 'text-zinc-400 hover:text-red-400 hover:bg-red-500/10'}`}
        >
          <AlertTriangle className="w-4 h-4 inline-block mr-2" />
          Danger Zone
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-400" />
            <h2 className="text-xl font-bold text-white">User Management</h2>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-zinc-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-zinc-500">
                <th className="pb-3 pl-4 font-semibold">User</th>
                <th className="pb-3 font-semibold">Role</th>
                <th className="pb-3 font-semibold">XP</th>
                <th className="pb-3 pr-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 pl-4">
                    <div className="flex items-center">
                      <div className="relative w-10 h-10 rounded-full overflow-hidden mr-3 border border-white/10">
                        <Image src={u.avatar} alt={u.name} fill className="object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{u.name}</p>
                        <p className="text-xs text-zinc-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      disabled={u.id === user.id}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold border focus:outline-none cursor-pointer ${
                        u.role === 'admin' 
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                          : u.role === 'editor'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      } ${u.id === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="user" className="bg-slate-900 text-white">user</option>
                      <option value="editor" className="bg-slate-900 text-white">editor</option>
                      <option value="admin" className="bg-slate-900 text-white">admin</option>
                    </select>
                  </td>
                  <td className="py-4 text-sm text-emerald-400 font-bold">
                    {u.xp.toLocaleString()} XP
                  </td>
                  <td className="py-4 pr-4 text-right space-x-2">
                    <button 
                      onClick={() => setUserToAddXP(u.id)}
                      className="p-2 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg transition-colors"
                      title="Add XP"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {u.id !== user.id && (
                      <button 
                        onClick={() => setUserToDelete(u.id)}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-500 text-sm">
                    No users found matching &quot;{searchQuery}&quot;
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {activeTab === 'customization' && (
        <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center mb-6">
            <Settings className="w-5 h-5 mr-2 text-purple-400" />
            <h2 className="text-xl font-bold text-white">System Customization</h2>
          </div>
          
          <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Software Name</label>
                <input 
                  type="text" 
                  value={localSettings.software_name || ''}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, software_name: e.target.value }))}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Dashboard Section Name</label>
                <input 
                  type="text" 
                  value={localSettings.section_dashboard || ''}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, section_dashboard: e.target.value }))}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Arena Section Name</label>
                <input 
                  type="text" 
                  value={localSettings.section_arena || ''}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, section_arena: e.target.value }))}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Tasks Section Name</label>
                <input 
                  type="text" 
                  value={localSettings.section_tasks || ''}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, section_tasks: e.target.value }))}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Leads Section Name</label>
                <input 
                  type="text" 
                  value={localSettings.section_leads || ''}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, section_leads: e.target.value }))}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Content Section Name</label>
                <input 
                  type="text" 
                  value={localSettings.section_content || ''}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, section_content: e.target.value }))}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all" 
                />
              </div>
              <div className="md:col-span-2 mt-4 border-t border-white/10 pt-6">
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Command Center Targets</h3>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Mission Progress Target ($)</label>
                <input 
                  type="number" 
                  value={localSettings.goalRevenue || ''}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, goalRevenue: e.target.value }))}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Total Views Target</label>
                <input 
                  type="number" 
                  value={localSettings.viewsTarget || ''}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, viewsTarget: e.target.value }))}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Telegram Joins Target</label>
                <input 
                  type="number" 
                  value={localSettings.telegramTarget || ''}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, telegramTarget: e.target.value }))}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Sales Target</label>
                <input 
                  type="number" 
                  value={localSettings.salesTarget || ''}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, salesTarget: e.target.value }))}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Days Remaining</label>
                <input 
                  type="number" 
                  value={localSettings.daysRemaining || ''}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, daysRemaining: e.target.value }))}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all" 
                />
              </div>
            </div>
            
            <Button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white">
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </form>
        </div>
      )}

      {activeTab === 'danger' && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center mb-6">
            <AlertTriangle className="w-6 h-6 mr-2 text-red-500" />
            <h2 className="text-xl font-bold text-red-500">Danger Zone</h2>
          </div>
          
          <p className="text-zinc-400 mb-8 max-w-2xl">
            These actions are irreversible. Deleting data here will permanently remove it from the database for all users. Please proceed with extreme caution.
          </p>
          
          <div className="space-y-4 max-w-xl">
            <div className="flex items-center justify-between p-4 bg-black/20 border border-red-500/10 rounded-xl">
              <div>
                <h3 className="text-white font-bold">Full Data Reset</h3>
                <p className="text-sm text-zinc-500">Permanently remove all tasks, leads, posts, and non-admin users.</p>
              </div>
              <Button onClick={() => {
                if (confirm('Are you absolutely sure you want to perform a FULL data reset? This action CANNOT be undone and will remove all non-admin users.')) {
                  socket?.emit('full_reset', null);
                  alert('Full data reset initiated.');
                }
              }} className="bg-red-600 hover:bg-red-500 text-white">
                Full Reset
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-black/20 border border-red-500/10 rounded-xl">
              <div>
                <h3 className="text-white font-bold">Delete All Tasks</h3>
                <p className="text-sm text-zinc-500">Permanently remove all active and completed missions.</p>
              </div>
              <Button onClick={() => handleClearData('tasks')} className="bg-red-600 hover:bg-red-500 text-white">
                Delete Tasks
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-black/20 border border-red-500/10 rounded-xl">
              <div>
                <h3 className="text-white font-bold">Delete All Leads</h3>
                <p className="text-sm text-zinc-500">Permanently remove all leads and sales data.</p>
              </div>
              <Button onClick={() => handleClearData('leads')} className="bg-red-600 hover:bg-red-500 text-white">
                Delete Leads
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-black/20 border border-red-500/10 rounded-xl">
              <div>
                <h3 className="text-white font-bold">Delete All Posts</h3>
                <p className="text-sm text-zinc-500">Permanently remove all content engine posts.</p>
              </div>
              <Button onClick={() => handleClearData('posts')} className="bg-red-600 hover:bg-red-500 text-white">
                Delete Posts
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add XP Modal */}
      <Modal isOpen={!!userToAddXP} onClose={() => { setUserToAddXP(null); setXpAmount(''); }} title="Add XP to User">
        <form onSubmit={handleAddXP} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">XP Amount</label>
            <input 
              type="number" 
              value={xpAmount}
              onChange={(e) => setXpAmount(e.target.value)}
              placeholder="e.g. 100" 
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-zinc-600" 
              required 
            />
          </div>
          <div className="flex space-x-3 justify-end mt-6">
            <Button type="button" variant="secondary" onClick={() => { setUserToAddXP(null); setXpAmount(''); }}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white">
              Add XP
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create User Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New User">
        <form onSubmit={handleCreateUser} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Name</label>
            <input 
              type="text" 
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="e.g. Jane Doe" 
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-zinc-600" 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Email</label>
            <input 
              type="email" 
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="e.g. jane@example.com" 
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-zinc-600" 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Password</label>
            <input 
              type="password" 
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-zinc-600" 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Role</label>
            <select 
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
            >
              <option value="user" className="bg-slate-900">User</option>
              <option value="editor" className="bg-slate-900">Editor</option>
              <option value="admin" className="bg-slate-900">Admin</option>
            </select>
          </div>
          <Button type="submit" className="w-full mt-6 bg-purple-600 hover:bg-purple-500 text-white">
            Create User
          </Button>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)} title="Confirm Deletion">
        <div className="space-y-6">
          <p className="text-zinc-300">
            Are you sure you want to delete this user? This action cannot be undone.
          </p>
          <div className="flex space-x-3 justify-end">
            <Button variant="secondary" onClick={() => setUserToDelete(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
