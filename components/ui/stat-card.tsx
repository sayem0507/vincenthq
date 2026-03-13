import { motion } from 'motion/react';

interface StatCardProps {
  title: string;
  value: string;
  target: string;
  icon: any;
  color: 'blue' | 'purple' | 'green' | 'yellow';
  delay: number;
}

export function StatCard({ title, value, target, icon: Icon, color, delay }: StatCardProps) {
  const colorMap = {
    blue: 'text-blue-400 bg-blue-500/5 border-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.05)]',
    purple: 'text-purple-400 bg-purple-500/5 border-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.05)]',
    green: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10 shadow-[0_0_20px_rgba(52,211,153,0.05)]',
    yellow: 'text-yellow-400 bg-yellow-500/5 border-yellow-500/10 shadow-[0_0_20px_rgba(234,179,8,0.05)]',
  };
  
  const progressColorMap = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    green: 'bg-emerald-500',
    yellow: 'bg-yellow-500',
  };
  
  const progress = Math.min(100, (parseInt(value.replace(/,/g, '')) / parseInt(target.replace(/,/g, ''))) * 100);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:bg-zinc-900/80 hover:border-white/10 transition-all duration-500 shadow-2xl"
    >
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">{title}</p>
          <h3 className="text-5xl font-extrabold text-white tracking-tighter">{value}</h3>
        </div>
        <div className={`p-4 rounded-2xl border ${colorMap[color]}`}>
          <Icon className="w-7 h-7" />
        </div>
      </div>
      
      <div className="mt-auto">
        <div className="flex justify-between text-[10px] font-bold mb-3">
          <span className="text-zinc-600 uppercase tracking-[0.1em]">Target: {target}</span>
          <span className="text-white">{progress.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.5, delay: delay + 0.2, ease: "easeOut" }}
            className={`h-full rounded-full ${progressColorMap[color]}`} 
          />
        </div>
      </div>
    </motion.div>
  );
}
