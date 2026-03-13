'use client';

import { useState } from 'react';
import { Plus, MessageSquare, CheckCircle2, XCircle, MoreHorizontal, X, DollarSign, Trash2, Users, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/lib/context';
import { cn } from '@/lib/utils';

type Lead = {
  id: string;
  name: string;
  platform: 'X' | 'Instagram' | 'Skool';
  status: 'Target Identified' | 'Contacted' | 'Replied' | 'Meeting/Pitch' | 'Closed' | 'Failed';
  assignee: string;
  userId?: string;
  userName?: string;
  saleLogged?: boolean;
  saleAmount?: number;
  createdAt?: string;
  subSector?: string;
  website?: string;
};

const initialLeads: Lead[] = [
  { id: '1', name: '@crypto_whale', platform: 'X', status: 'Target Identified', assignee: 'Alex' },
  { id: '2', name: 'fitness_guru', platform: 'Instagram', status: 'Contacted', assignee: 'Jordan' },
  { id: '3', name: 'SaaS Founder', platform: 'Skool', status: 'Replied', assignee: 'Taylor' },
  { id: '4', name: '@indie_hacker', platform: 'X', status: 'Meeting/Pitch', assignee: 'Alex' },
  { id: '5', name: 'marketing_pro', platform: 'Instagram', status: 'Closed', assignee: 'Jordan' },
  { id: '6', name: '@design_lead', platform: 'X', status: 'Failed', assignee: 'Taylor' },
];

const columns = ['Target Identified', 'Contacted', 'Replied', 'Meeting/Pitch', 'Closed', 'Failed'] as const;

const generateId = () => crypto.randomUUID();

export default function OutreachCRM() {
  const { socket, user, users, settings } = useAppContext();
  const allLeads = useAppContext().leads as Lead[];
  const leads = allLeads.filter(l => ['X', 'Instagram', 'Skool'].includes(l.platform));
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isNewTargetModalOpen, setIsNewTargetModalOpen] = useState(false);
  const [isLogSaleModalOpen, setIsLogSaleModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);
  const [selectedLeadForSale, setSelectedLeadForSale] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('All');
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  
  // Loading states
  const [isLoggingDM, setIsLoggingDM] = useState(false);
  const [isAddingTarget, setIsAddingTarget] = useState(false);
  const [isLoggingSale, setIsLoggingSale] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  
  // Form states
  const [newTargetName, setNewTargetName] = useState('');
  const [newTargetPlatform, setNewTargetPlatform] = useState<'X' | 'Instagram' | 'Skool'>('X');
  const [newTargetSubSector, setNewTargetSubSector] = useState('');
  const [newTargetWebsite, setNewTargetWebsite] = useState('');
  const [saleAmount, setSaleAmount] = useState('');
  const [logDMUsername, setLogDMUsername] = useState('');
  const [logDMNotes, setLogDMNotes] = useState('');
  const [logDMPlatform, setLogDMPlatform] = useState<'X' | 'Instagram' | 'Skool'>('X');

  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const moveLead = (id: string, newStatus: Lead['status']) => {
    const lead = leads.find(l => l.id === id);
    if (lead) {
      if (newStatus === 'Closed' && !lead.saleLogged) {
        setSelectedLeadForSale(lead);
        setIsLogSaleModalOpen(true);
      }
      socket?.emit('update_lead', { ...lead, status: newStatus });
    }
  };

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLeadId(lead.id);
    e.dataTransfer.setData('application/json', JSON.stringify(lead));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedLeadId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.currentTarget as HTMLElement;
    target.classList.add('bg-white/[0.08]');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('bg-white/[0.08]');
  };

  const handleDrop = (e: React.DragEvent, newStatus: Lead['status']) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('bg-white/[0.08]');
    
    try {
      const leadData = JSON.parse(e.dataTransfer.getData('application/json')) as Lead;
      if (leadData.status !== newStatus) {
        moveLead(leadData.id, newStatus);
      }
    } catch (err) {
      console.error('Failed to parse dropped lead data', err);
    }
  };

  const handleAddTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTargetName || !user) return;
    
    setIsAddingTarget(true);
    await new Promise(r => setTimeout(r, 600)); // Simulate network request
    
    const newLead: Lead = {
      id: crypto.randomUUID(),
      name: newTargetName,
      platform: newTargetPlatform,
      status: 'Target Identified',
      assignee: user.name,
      userId: user.id,
      userName: user.name,
      subSector: newTargetSubSector,
      website: newTargetWebsite,
    };
    
    socket?.emit('update_lead', newLead);
    setNewTargetName('');
    setNewTargetSubSector('');
    setNewTargetWebsite('');
    setIsAddingTarget(false);
    setIsNewTargetModalOpen(false);
  };

  const handleLogDM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logDMUsername || !user) return;
    
    setIsLoggingDM(true);
    await new Promise(r => setTimeout(r, 600)); // Simulate network request
    
    socket?.emit('update_user_xp', { userId: user.id, xpToAdd: 5 });
    
    // Also check if this user exists in leads and update their status if they were just a target
    const existingLead = leads.find(l => l.name.toLowerCase() === logDMUsername.toLowerCase());
    if (existingLead) {
      if (existingLead.status === 'Target Identified') {
        socket?.emit('update_lead', { ...existingLead, status: 'Contacted' });
      }
    } else {
      // Add as a new lead in 'Contacted' status
      const newLead: Lead = {
        id: generateId(),
        name: logDMUsername,
        platform: logDMPlatform,
        status: 'Contacted',
        assignee: user.name,
        userId: user.id,
        userName: user.name,
        createdAt: new Date().toISOString(),
      };
      socket?.emit('update_lead', newLead);
    }

    setIsLoggingDM(false);
    setIsLogModalOpen(false);
    setLogDMUsername('');
    setLogDMNotes('');
    showStatus('Activity logged! +5 XP awarded.');
  };

  const handleLogSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForSale || !saleAmount) return;
    
    setIsLoggingSale(true);
    await new Promise(r => setTimeout(r, 800)); // Simulate network request
    
    const amount = Number(saleAmount);
    socket?.emit('update_lead', { ...selectedLeadForSale, saleLogged: true, saleAmount: amount });
    
    const assigneeUser = users.find(u => u.name === selectedLeadForSale.assignee);
    if (assigneeUser) {
      socket?.emit('update_user_xp', { userId: assigneeUser.id, xpToAdd: 150 });
    }
    
    setIsLoggingSale(false);
    setIsLogSaleModalOpen(false);
    setSaleAmount('');
    setSelectedLeadForSale(null);
    showStatus(`Sale of $${amount} logged! +150 XP awarded.`);
  };

  const handleEditLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    
    setIsSavingEdit(true);
    await new Promise(r => setTimeout(r, 600)); // Simulate network request
    
    socket?.emit('update_lead', editingLead);
    setEditingLead(null);
    setIsSavingEdit(false);
    showStatus('Lead updated successfully.');
  };

  const totalOutreach = leads.length;
  const repliedLeads = leads.filter(l => ['Replied', 'Meeting/Pitch', 'Closed', 'Failed'].includes(l.status)).length;
  const closedLeads = leads.filter(l => l.status === 'Closed').length;
  const totalSalesCount = leads.filter(l => l.saleLogged).length;
  const totalSalesVolume = leads.reduce((sum, l) => sum + (l.saleAmount || 0), 0);

  const replyRate = totalOutreach > 0 ? ((repliedLeads / totalOutreach) * 100).toFixed(1) : '0.0';
  const closeRate = totalOutreach > 0 ? ((closedLeads / totalOutreach) * 100).toFixed(1) : '0.0';

  const filteredLeads = leads.filter(l => {
    const query = searchQuery.toLowerCase();
    const matchesQuery = l.name.toLowerCase().includes(query) ||
      l.assignee.toLowerCase().includes(query) ||
      l.platform.toLowerCase().includes(query) ||
      l.status.toLowerCase().includes(query);
    const matchesAssignee = filterAssignee === 'All' || l.assignee === filterAssignee;
    return matchesQuery && matchesAssignee;
  });

  return (
    <div className="p-8 h-full flex flex-col relative">
      {/* Status Message */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-8 right-8 px-6 py-3 rounded-2xl shadow-2xl z-[100] border backdrop-blur-xl flex items-center space-x-3",
              statusMessage.type === 'success' ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-red-500/20 border-red-500/30 text-red-400"
            )}
          >
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <span className="font-bold">{statusMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex justify-between items-end"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">{settings?.section_leads || 'Outreach CRM'}</h1>
            <p className="text-zinc-400">Manage your pipeline and log activities to earn XP.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search leads, users..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
            </div>
            <div className="relative w-full sm:w-48">
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all appearance-none"
              >
                <option value="All" className="bg-slate-900">All Team Members</option>
                {users.map(u => (
                  <option key={u.id} value={u.name} className="bg-slate-900">{u.name}</option>
                ))}
              </select>
            </div>
            <div className="flex space-x-3 w-full sm:w-auto">
              <Button 
                variant="secondary"
                onClick={() => setIsLogModalOpen(true)}
                className="flex-1 sm:flex-none"
              >
                <MessageSquare className="w-4 h-4 mr-2 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                Log DM (+5 XP)
              </Button>
              <Button 
                onClick={() => setIsNewTargetModalOpen(true)}
                className="flex-1 sm:flex-none"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Target
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Conversion Stats */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
      >
        <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Team Reply Rate</p>
            <p className="text-3xl font-black text-white drop-shadow-sm">{replyRate}%</p>
          </div>
          <div className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md text-xs font-bold shadow-[0_0_10px_rgba(52,211,153,0.1)]">Active</div>
        </div>
        <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Team Close Rate</p>
            <p className="text-3xl font-black text-white drop-shadow-sm">{closeRate}%</p>
          </div>
          <div className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md text-xs font-bold shadow-[0_0_10px_rgba(52,211,153,0.1)]">Active</div>
        </div>
        <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Total Outreach</p>
            <p className="text-3xl font-black text-white drop-shadow-sm">{totalOutreach}</p>
          </div>
          <div className="text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-md text-xs font-bold shadow-[0_0_10px_rgba(59,130,246,0.1)]">Pipeline</div>
        </div>
        <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Total Sales</p>
            <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 drop-shadow-sm">${totalSalesVolume.toLocaleString()}</p>
          </div>
          <div className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md text-xs font-bold shadow-[0_0_10px_rgba(52,211,153,0.1)]">{totalSalesCount} closed</div>
        </div>
      </motion.div>

      {/* Kanban Board */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex-1 overflow-x-auto pb-4"
      >
        <div className="flex space-x-6 min-w-max h-full">
          {columns.map((column, colIdx) => (
            <div 
              key={column} 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column)}
              className="w-80 flex flex-col bg-white/[0.02] backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl transition-colors duration-200"
            >
              <div className="p-5 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-bold text-white tracking-wide">{column}</h3>
                <span className="bg-white/10 text-zinc-300 text-xs font-bold px-2.5 py-1 rounded-full border border-white/10">
                  {leads.filter(l => l.status === column).length}
                </span>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-4 min-h-[200px]">
                {filteredLeads.filter(l => l.status === column).map((lead, idx) => (
                  <motion.div
                    key={lead.id}
                    layoutId={lead.id}
                    draggable
                    onDragStart={(e: any) => handleDragStart(e, lead)}
                    onDragEnd={handleDragEnd}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ 
                      opacity: draggedLeadId === lead.id ? 0.4 : 1, 
                      scale: draggedLeadId === lead.id ? 1.05 : 1,
                      rotate: draggedLeadId === lead.id ? 2 : 0
                    }}
                    transition={{ delay: 0.1 + (idx * 0.05), type: 'spring', stiffness: 300, damping: 20 }}
                    className={`bg-white/[0.04] border border-white/10 rounded-2xl p-5 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300 shadow-lg group relative cursor-grab active:cursor-grabbing ${draggedLeadId === lead.id ? 'z-50 ring-2 ring-blue-500/50' : ''}`}
                  >
                          <div className="flex justify-between items-start mb-4">
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                              lead.platform === 'X' ? 'bg-black/50 text-white border-white/20' :
                              lead.platform === 'Instagram' ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-300 border-pink-500/30' :
                              'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            }`}>
                              {lead.platform}
                            </span>
                            <div className="flex items-center space-x-2">
                              {user?.role === 'admin' && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLeadToDelete(lead.id);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md transition-colors border border-red-500/20"
                                  title="Delete Lead"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button onClick={() => setEditingLead(lead)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                                <MoreHorizontal className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                          <h4 className="text-lg font-bold text-white">{lead.name}</h4>
                          {lead.subSector && (
                            <span className="text-xs text-zinc-400 mb-1 block">
                              {lead.subSector}
                            </span>
                          )}
                          {lead.website && (
                            <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline mb-4 block truncate">
                              {lead.website}
                            </a>
                          )}
                          <div className="flex justify-between items-center mt-4">
                            <div className="flex items-center text-xs font-medium text-zinc-400">
                              <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold mr-2 text-[10px] shadow-sm">
                                {lead.assignee.charAt(0)}
                              </div>
                              {lead.assignee}
                            </div>
                            
                            {/* Action Buttons based on status */}
                            {column === 'Target Identified' && (
                              <button onClick={() => moveLead(lead.id, 'Contacted')} className="text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg hover:bg-blue-500/30 transition-all">
                                DM Sent
                              </button>
                            )}
                            {column === 'Contacted' && (
                              <button onClick={() => moveLead(lead.id, 'Replied')} className="text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-lg hover:bg-purple-500/30 transition-all">
                                Got Reply
                              </button>
                            )}
                            {column === 'Replied' && (
                              <button onClick={() => moveLead(lead.id, 'Meeting/Pitch')} className="text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-3 py-1.5 rounded-lg hover:bg-yellow-500/30 transition-all">
                                Pitched
                              </button>
                            )}
                            {column === 'Meeting/Pitch' && (
                              <div className="flex space-x-2">
                                <button onClick={() => moveLead(lead.id, 'Closed')} className="text-emerald-400 hover:text-emerald-300 hover:scale-110 transition-transform bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                                  <CheckCircle2 className="w-5 h-5" />
                                </button>
                                <button onClick={() => moveLead(lead.id, 'Failed')} className="text-red-400 hover:text-red-300 hover:scale-110 transition-transform bg-red-500/10 p-1.5 rounded-lg border border-red-500/20">
                                  <XCircle className="w-5 h-5" />
                                </button>
                              </div>
                            )}
                            {column === 'Closed' && !lead.saleLogged && (
                              <button onClick={() => { setSelectedLeadForSale(lead); setIsLogSaleModalOpen(true); }} className="text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg hover:bg-emerald-500/30 transition-all shadow-[0_0_10px_rgba(52,211,153,0.2)]">
                                Log Sale
                              </button>
                            )}
                            {column === 'Closed' && lead.saleLogged && (
                              <span className="text-xs text-emerald-400 font-bold flex items-center bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Logged
                              </span>
                            )}
                          </div>
                        </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Log DM Modal */}
      <Modal 
        isOpen={isLogModalOpen} 
        onClose={() => setIsLogModalOpen(false)} 
        title="Log Activity"
      >
        <form onSubmit={handleLogDM} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Platform</label>
            <select 
              value={logDMPlatform}
              onChange={(e) => setLogDMPlatform(e.target.value as any)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
            >
              <option value="X" className="bg-slate-900">X (Twitter)</option>
              <option value="Instagram" className="bg-slate-900">Instagram</option>
              <option value="Skool" className="bg-slate-900">Skool</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Target Username / Handle</label>
            <input 
              type="text" 
              value={logDMUsername}
              onChange={(e) => setLogDMUsername(e.target.value)}
              placeholder="@username" 
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-zinc-600" 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Notes (Optional)</label>
            <textarea 
              value={logDMNotes}
              onChange={(e) => setLogDMNotes(e.target.value)}
              placeholder="What did you say?" 
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all h-28 resize-none placeholder:text-zinc-600"
            ></textarea>
          </div>
          <Button type="submit" className="w-full mt-6" isLoading={isLoggingDM}>
            <MessageSquare className="w-5 h-5 mr-2" />
            Log DM & Claim +5 XP
          </Button>
        </form>
      </Modal>

      {/* New Target Modal */}
      <Modal 
        isOpen={isNewTargetModalOpen} 
        onClose={() => setIsNewTargetModalOpen(false)} 
        title="Add New Target"
      >
        <form onSubmit={handleAddTarget} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Target Name / Handle</label>
            <input 
              type="text" 
              value={newTargetName}
              onChange={(e) => setNewTargetName(e.target.value)}
              placeholder="e.g. @investor_john" 
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-zinc-600" 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Platform</label>
            <select 
              value={newTargetPlatform}
              onChange={(e) => setNewTargetPlatform(e.target.value as any)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
            >
              <option value="X" className="bg-slate-900">X (Twitter)</option>
              <option value="Instagram" className="bg-slate-900">Instagram</option>
              <option value="Skool" className="bg-slate-900">Skool</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Sub-sector</label>
            <select 
              value={newTargetSubSector}
              onChange={(e) => setNewTargetSubSector(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
            >
              <option value="" className="bg-slate-900">Select Sub-sector</option>
              <option value="Crypto" className="bg-slate-900">Crypto</option>
              <option value="Fitness" className="bg-slate-900">Fitness</option>
              <option value="SaaS" className="bg-slate-900">SaaS</option>
              <option value="Other" className="bg-slate-900">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Website/Link (Optional)</label>
            <input 
              type="url" 
              value={newTargetWebsite}
              onChange={(e) => setNewTargetWebsite(e.target.value)}
              placeholder="e.g. https://example.com" 
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-zinc-600" 
            />
          </div>
          <Button type="submit" className="w-full mt-6" isLoading={isAddingTarget}>
            Add to Pipeline
          </Button>
        </form>
      </Modal>

      {/* Log Sale Modal */}
      <Modal 
        isOpen={isLogSaleModalOpen && selectedLeadForSale !== null} 
        onClose={() => { setIsLogSaleModalOpen(false); setSelectedLeadForSale(null); }} 
        title="Log Sale"
      >
        {selectedLeadForSale && (
          <form onSubmit={handleLogSale} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Client</label>
              <input type="text" value={selectedLeadForSale.name} disabled className="w-full bg-black/10 border border-white/5 rounded-xl px-4 py-3 text-zinc-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Assignee</label>
              <input type="text" value={selectedLeadForSale.assignee} disabled className="w-full bg-black/10 border border-white/5 rounded-xl px-4 py-3 text-zinc-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Sale Amount ($)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-zinc-400" />
                </div>
                <input 
                  type="number" 
                  value={saleAmount}
                  onChange={(e) => setSaleAmount(e.target.value)}
                  placeholder="e.g. 1000" 
                  className="w-full bg-black/20 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-600 text-lg font-bold" 
                  required 
                  min="1"
                />
              </div>
            </div>
            <Button type="submit" variant="success" className="w-full mt-6" isLoading={isLoggingSale}>
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Log Sale & Claim +150 XP
            </Button>
          </form>
        )}
      </Modal>

      {/* Edit Target Modal */}
      <Modal 
        isOpen={!!editingLead} 
        onClose={() => setEditingLead(null)} 
        title="Edit Target"
      >
        {editingLead && (
          <form onSubmit={handleEditLead} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Target Name / Handle</label>
              <input 
                type="text" 
                value={editingLead.name}
                onChange={(e) => setEditingLead({...editingLead, name: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-zinc-600" 
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Platform</label>
              <select 
                value={editingLead.platform}
                onChange={(e) => setEditingLead({...editingLead, platform: e.target.value as any})}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              >
                <option value="X" className="bg-slate-900">X (Twitter)</option>
                <option value="Instagram" className="bg-slate-900">Instagram</option>
                <option value="Skool" className="bg-slate-900">Skool</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Sub-sector</label>
              <select 
                value={editingLead.subSector || ''}
                onChange={(e) => setEditingLead({...editingLead, subSector: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              >
                <option value="" className="bg-slate-900">Select Sub-sector</option>
                <option value="Crypto" className="bg-slate-900">Crypto</option>
                <option value="Fitness" className="bg-slate-900">Fitness</option>
                <option value="SaaS" className="bg-slate-900">SaaS</option>
                <option value="Other" className="bg-slate-900">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Website/Link (Optional)</label>
              <input 
                type="url" 
                value={editingLead.website || ''}
                onChange={(e) => setEditingLead({...editingLead, website: e.target.value})}
                placeholder="e.g. https://example.com" 
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-zinc-600" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Status</label>
              <select 
                value={editingLead.status}
                onChange={(e) => setEditingLead({...editingLead, status: e.target.value as any})}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              >
                {columns.map(col => (
                  <option key={col} value={col} className="bg-slate-900">{col}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Assignee</label>
              <select 
                value={editingLead.assignee}
                onChange={(e) => setEditingLead({...editingLead, assignee: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                required
              >
                <option value="" className="bg-slate-900">Select Assignee</option>
                {users.map(u => (
                  <option key={u.id} value={u.name} className="bg-slate-900">{u.name}</option>
                ))}
              </select>
            </div>
            <Button type="submit" className="w-full mt-6" isLoading={isSavingEdit}>
              Save Changes
            </Button>
          </form>
        )}
      </Modal>
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Lead"
      >
        <div className="space-y-6">
          <p className="text-zinc-400">Are you sure you want to delete this lead? This action cannot be undone.</p>
          <div className="flex space-x-3 justify-end">
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (leadToDelete) {
                  socket?.emit('delete_lead', leadToDelete);
                  setIsDeleteModalOpen(false);
                  setLeadToDelete(null);
                  showStatus('Lead deleted successfully.');
                }
              }}
            >
              Delete Lead
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
