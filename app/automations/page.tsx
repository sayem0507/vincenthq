'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Zap, Plus, Settings, Play, Pause, Activity, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { Button } from '@/components/ui/button';

export default function AutomationsPage() {
  const { settings } = useAppContext();
  const [activeTab, setActiveTab] = useState('active');

  const automations = [
    { id: 1, name: 'New Lead to Slack Notification', trigger: 'Lead Created', action: 'Send Slack Message', status: 'active', lastRun: '10 mins ago', successRate: '99%' },
    { id: 2, name: 'Weekly Report Generation', trigger: 'Schedule (Friday 5PM)', action: 'Generate PDF & Email', status: 'active', lastRun: '2 days ago', successRate: '100%' },
    { id: 3, name: 'Task Overdue Alert', trigger: 'Task Past Due Date', action: 'Email Assignee', status: 'paused', lastRun: '1 week ago', successRate: 'N/A' },
    { id: 4, name: 'Sync Users to Mailchimp', trigger: 'User Created', action: 'Add to Mailchimp List', status: 'active', lastRun: '1 hour ago', successRate: '95%' },
  ];

  const filteredAutomations = automations.filter(auto => 
    activeTab === 'all' || auto.status === activeTab
  );

  return (
    <div className="p-8 h-full flex flex-col relative overflow-y-auto">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center">
            <Zap className="w-8 h-8 mr-3 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
            Automations & Integrations
          </h1>
          <p className="text-zinc-400">Streamline workflows with automated actions and third-party integrations.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button className="bg-amber-600 hover:bg-amber-500 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Create Workflow
          </Button>
        </div>
      </motion.header>

      <div className="flex space-x-4 mb-6 border-b border-white/10 pb-2">
        <button 
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'active' ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
        >
          <Play className="w-4 h-4 inline-block mr-2" />
          Active Workflows
        </button>
        <button 
          onClick={() => setActiveTab('paused')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'paused' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
        >
          <Pause className="w-4 h-4 inline-block mr-2" />
          Paused
        </button>
        <button 
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'all' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
        >
          <Activity className="w-4 h-4 inline-block mr-2" />
          All Workflows
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredAutomations.map(auto => (
          <motion.div
            key={auto.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/[0.04] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-start md:items-center gap-4">
              <div className={`p-3 rounded-xl ${auto.status === 'active' ? 'bg-amber-500/10 text-amber-400' : 'bg-zinc-500/10 text-zinc-400'}`}>
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1 flex items-center">
                  {auto.name}
                  {auto.status === 'active' ? (
                    <span className="ml-3 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20 flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                    </span>
                  ) : (
                    <span className="ml-3 px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400 text-xs font-medium border border-zinc-500/20 flex items-center">
                      <Pause className="w-3 h-3 mr-1" /> Paused
                    </span>
                  )}
                </h3>
                <div className="flex items-center text-sm text-zinc-400 space-x-2">
                  <span className="font-medium text-zinc-300">When:</span>
                  <span>{auto.trigger}</span>
                  <span className="text-zinc-600">→</span>
                  <span className="font-medium text-zinc-300">Then:</span>
                  <span>{auto.action}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 md:ml-auto">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-1">Last Run</p>
                <p className="text-sm text-white flex items-center justify-end">
                  <Clock className="w-3 h-3 mr-1 text-zinc-400" />
                  {auto.lastRun}
                </p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-1">Success Rate</p>
                <p className="text-sm text-emerald-400 font-bold">{auto.successRate}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg transition-colors border border-white/10" title="Settings">
                  <Settings className="w-4 h-4" />
                </button>
                <button 
                  className={`p-2 rounded-lg transition-colors border ${
                    auto.status === 'active' 
                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20' 
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                  }`}
                  title={auto.status === 'active' ? 'Pause Workflow' : 'Activate Workflow'}
                >
                  {auto.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        {filteredAutomations.length === 0 && (
          <div className="py-12 text-center text-zinc-500">
            No workflows found for this status.
          </div>
        )}
      </div>
    </div>
  );
}
