'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { BarChart3, TrendingUp, Users, Activity, ArrowUpRight, ArrowDownRight, Calendar as CalendarIcon, Download, CheckSquare, Target } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';

export default function AnalyticsPage() {
  const { tasks, leads, posts, settings } = useAppContext();
  const [timeframe, setTimeframe] = useState('30d');

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalLeads = leads.length;
  const convertedLeads = leads.filter(l => l.status === 'closed').length;
  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  const totalRevenue = leads.reduce((acc, lead) => acc + (lead.saleAmount || 0), 0);
  const goalRevenue = parseInt(settings?.goalRevenue || '10000');
  const revenueProgress = Math.min(Math.round((totalRevenue / goalRevenue) * 100), 100);

  return (
    <div className="p-8 h-full flex flex-col relative overflow-y-auto">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center">
            <BarChart3 className="w-8 h-8 mr-3 text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.8)]" />
            Analytics & Reports
          </h1>
          <p className="text-zinc-400">Track performance metrics and team productivity.</p>
        </div>
        <div className="flex items-center space-x-3">
          <select 
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
          >
            <option value="7d" className="bg-slate-900">Last 7 Days</option>
            <option value="30d" className="bg-slate-900">Last 30 Days</option>
            <option value="90d" className="bg-slate-900">Last 90 Days</option>
            <option value="all" className="bg-slate-900">All Time</option>
          </select>
          <Button variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          target={`$${goalRevenue.toLocaleString()}`}
          icon={TrendingUp}
          color="green"
          delay={0.1}
        />
        <StatCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          target="100%"
          icon={Users}
          color="blue"
          delay={0.2}
        />
        <StatCard
          title="Task Completion"
          value={`${taskCompletionRate}%`}
          target="100%"
          icon={CheckSquare}
          color="purple"
          delay={0.3}
        />
        <StatCard
          title="Active Projects"
          value={tasks.filter(t => t.status === 'in-progress').length.toString()}
          target="10"
          icon={Activity}
          color="yellow"
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Progress */}
        <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center">
            <Target className="w-5 h-5 mr-2 text-emerald-400" />
            Revenue Goal Progress
          </h3>
          <div className="flex items-end justify-between mb-2">
            <span className="text-3xl font-bold text-white">${totalRevenue.toLocaleString()}</span>
            <span className="text-sm text-zinc-400">Target: ${goalRevenue.toLocaleString()}</span>
          </div>
          <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${revenueProgress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 relative"
            >
              <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)', transform: 'skewX(-20deg)' }} />
            </motion.div>
          </div>
          <p className="text-right text-xs text-emerald-400 mt-2 font-medium">{revenueProgress}% Achieved</p>
        </div>

        {/* Lead Sources (Mock Data for now) */}
        <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-400" />
            Lead Sources
          </h3>
          <div className="space-y-4">
            {[
              { source: 'Organic Search', count: 45, percentage: 40, color: 'bg-blue-500' },
              { source: 'Social Media', count: 32, percentage: 28, color: 'bg-purple-500' },
              { source: 'Referrals', count: 20, percentage: 18, color: 'bg-emerald-500' },
              { source: 'Direct', count: 16, percentage: 14, color: 'bg-amber-500' },
            ].map((item) => (
              <div key={item.source}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-300">{item.source}</span>
                  <span className="text-white font-medium">{item.count}</span>
                </div>
                <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percentage}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className={`h-full ${item.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
