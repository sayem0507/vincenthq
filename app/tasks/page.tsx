'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckSquare, Plus, Lock, Unlock, MessageSquare, AlertCircle, CheckCircle2, X, Bell, Send, Trophy, Flame, Search, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';
import Image from 'next/image';
import { useAppContext } from '@/lib/context';

type Comment = {
  id: string;
  author: string;
  text: string;
  timestamp: Date;
};

type Subtask = {
  id: string;
  title: string;
  completed: boolean;
};

type Task = {
  id: string;
  title: string;
  status: 'Todo' | 'In Progress' | 'Done';
  assignee: string;
  xpReward: number;
  dependencies: string[]; // IDs of tasks that must be completed first
  comments: Comment[];
  progress: number;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  tags?: string[];
  estimatedHours?: number;
  subtasks?: Subtask[];
  dueDate?: string;
  recurring?: 'None' | 'Daily' | 'Weekly' | 'Monthly';
  attachments?: string[];
  timeSpent?: number;
};

const initialTasks: Task[] = [
  { id: 't1', title: 'Design Landing Page', status: 'Done', assignee: 'Alex', xpReward: 100, dependencies: [], comments: [], progress: 100 },
  { id: 't2', title: 'Implement Auth', status: 'In Progress', assignee: 'Jordan', xpReward: 150, dependencies: [], comments: [], progress: 45 },
  { id: 't3', title: 'Launch Campaign', status: 'Todo', assignee: 'Alex', xpReward: 200, dependencies: ['t1', 't2'], comments: [], progress: 0 },
  { id: 't4', title: 'Write Blog Post', status: 'Todo', assignee: 'Taylor', xpReward: 50, dependencies: [], comments: [], progress: 0 },
];

export default function TasksPage() {
  const { users, socket, user, notificationsEnabled } = useAppContext();
  const tasks = (useAppContext().tasks as Task[]) || [];
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('All');
  const popupCounter = useRef(0);
  
  const [error, setError] = useState<string | null>(null);
  
  // New Task Form
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDependencies, setNewTaskDependencies] = useState<string[]>([]);
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [newTaskTags, setNewTaskTags] = useState<string>('');
  const [newTaskEstimatedHours, setNewTaskEstimatedHours] = useState<string>('');

  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('');
  const [newTaskRecurring, setNewTaskRecurring] = useState<'None' | 'Daily' | 'Weekly' | 'Monthly'>('None');

  // Notifications
  const [notifications, setNotifications] = useState<{id: string, text: string, time: Date}[]>([]);

  // Gamification State
  const leaderboard = [...users].sort((a, b) => b.xp - a.xp);
  const [xpPopups, setXpPopups] = useState<{id: string, xp: number, x: number, y: number}[]>([]);

  // Simulation of real-time updates
  useEffect(() => {
    if (!notificationsEnabled) return;
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setNotifications(prev => [{
          id: Math.random().toString(),
          text: `Jordan commented on "Implement Auth"`,
          time: new Date()
        }, ...prev]);
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [notificationsEnabled]);

  const hasCircularDependency = (taskId: string, targetDepId: string, currentTasks: Task[]): boolean => {
    // If targetDepId depends on taskId, adding targetDepId as a dependency to taskId creates a cycle.
    const visited = new Set<string>();
    const stack = [targetDepId];
    
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === taskId) return true; // Cycle detected
      if (!visited.has(current)) {
        visited.add(current);
        const task = currentTasks.find(t => t.id === current);
        if (task) {
          stack.push(...task.dependencies);
        }
      }
    }
    return false;
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle || !user) return;
    
    try {
      const newTask: Task = {
        id: Math.random().toString(36).substr(2, 9),
        title: newTaskTitle,
        status: 'Todo',
        assignee: newTaskAssignee || user.name,
        xpReward: 50,
        dependencies: newTaskDependencies,
        comments: [],
        progress: 0,
        priority: newTaskPriority,
        tags: newTaskTags.split(',').map(t => t.trim()).filter(t => t),
        estimatedHours: newTaskEstimatedHours ? parseFloat(newTaskEstimatedHours) : undefined,
        subtasks: [],
        dueDate: newTaskDueDate || undefined,
        recurring: newTaskRecurring,
        attachments: [],
        timeSpent: 0
      };
      
      socket?.emit('update_task', newTask);
      setNewTaskTitle('');
      setNewTaskDependencies([]);
      setNewTaskAssignee('');
      setNewTaskPriority('Medium');
      setNewTaskTags('');
      setNewTaskEstimatedHours('');
      setNewTaskDueDate('');
      setNewTaskRecurring('None');
      setIsNewTaskModalOpen(false);
      setError(null);
      
      if (notificationsEnabled) {
        setNotifications(prev => [{
          id: Math.random().toString(),
          text: `New task "${newTask.title}" created.`,
          time: new Date()
        }, ...prev]);
      }
    } catch (err) {
      setError('Failed to create task. Please try again.');
    }
  };

  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Check dependencies if moving to In Progress or Done
    if (newStatus !== 'Todo') {
      const uncompletedDeps = (task.dependencies || []).filter(depId => {
        const depTask = tasks.find(t => t.id === depId);
        return depTask && depTask.status !== 'Done';
      });
      
      if (uncompletedDeps.length > 0) {
        console.warn('Cannot start this task until all dependencies are completed!');
        return;
      }
    }

    const updatedTask = { ...task, status: newStatus };
    socket?.emit('update_task', updatedTask);
    
    // Update selectedTask if it's currently open
    if (selectedTask?.id === taskId) {
      setSelectedTask(updatedTask);
    }

    if (newStatus === 'Done') {
      // Trigger gamification
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#34d399', '#10b981', '#059669']
      });

      // Update XP via socket
      const assigneeUser = users.find(u => u.name === task.assignee);
      if (assigneeUser) {
        socket?.emit('update_user_xp', { userId: assigneeUser.id, xpToAdd: task.xpReward });
      }

      // Show floating XP popup
      const popupId = (popupCounter.current++).toString();
      setXpPopups(prev => [...prev, { id: popupId, xp: task.xpReward, x: window.innerWidth / 2, y: window.innerHeight / 2 }]);
      setTimeout(() => {
        setXpPopups(prev => prev.filter(p => p.id !== popupId));
      }, 2000);

      // Add notification
      if (notificationsEnabled) {
        setNotifications(prev => [{
          id: Math.random().toString(),
          text: `You completed "${task.title}" and earned +${task.xpReward} XP!`,
          time: new Date()
        }, ...prev]);
      }
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newComment || !user) return;

    const comment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      author: user.name,
      text: newComment,
      timestamp: new Date()
    };

    const updatedTask = { ...selectedTask, comments: [...(selectedTask.comments || []), comment] };
    socket?.emit('update_task', updatedTask);
    setSelectedTask(updatedTask);
    setNewComment('');

    // Check for mentions
    if (newComment.includes('@') && notificationsEnabled) {
      setNotifications(prev => [{
        id: Math.random().toString(),
        text: `You mentioned someone in "${selectedTask.title}"`,
        time: new Date()
      }, ...prev]);
    }
  };

  const handleDeleteTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    socket?.emit('delete_task', taskId);
  };

  const handleProgressChange = (taskId: string, progress: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const updatedTask = { ...task, progress };
    socket?.emit('update_task', updatedTask);
    if (selectedTask?.id === taskId) {
      setSelectedTask(updatedTask);
    }
  };

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
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

  const handleDrop = (e: React.DragEvent, newStatus: Task['status']) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('bg-white/[0.08]');
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      handleStatusChange(taskId, newStatus);
    }
  };

  const filteredTasks = tasks.filter(t => {
    const query = searchQuery.toLowerCase();
    const matchesQuery = t.title.toLowerCase().includes(query) ||
      t.assignee.toLowerCase().includes(query) ||
      t.status.toLowerCase().includes(query);
    const matchesAssignee = filterAssignee === 'All' || t.assignee === filterAssignee;
    return matchesQuery && matchesAssignee;
  });

  const renderTaskCard = (task: Task) => {
    const uncompletedDeps = (task.dependencies || []).filter(depId => {
      const depTask = tasks.find(t => t.id === depId);
      return depTask && depTask.status !== 'Done';
    });
    const isLocked = uncompletedDeps.length > 0;

    return (
      <motion.div
        key={task.id}
        layoutId={task.id}
        draggable={!isLocked}
        onDragStart={(e: any) => handleDragStart(e, task.id)}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          opacity: draggedTaskId === task.id ? 0.4 : 1, 
          scale: draggedTaskId === task.id ? 1.05 : 1,
          rotate: draggedTaskId === task.id ? 2 : 0
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        onClick={() => setSelectedTask(task)}
        className={`bg-white/[0.04] border border-white/10 rounded-2xl p-5 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300 shadow-lg relative overflow-hidden group ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'} ${draggedTaskId === task.id ? 'z-50 ring-2 ring-blue-500/50' : ''}`}
      >
        <div className="flex justify-between items-start mb-3">
          <h4 className="text-lg font-bold text-white pr-6">{task.title}</h4>
          <div className="flex items-center space-x-2 absolute top-5 right-5">
            {user?.role === 'admin' && (
              <button 
                onClick={(e) => handleDeleteTask(task.id, e)}
                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md transition-colors border border-red-500/20 mr-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            {isLocked ? (
              <Lock className="w-4 h-4 text-red-400" />
            ) : (
              <Unlock className="w-4 h-4 text-emerald-400 opacity-50" />
            )}
          </div>
        </div>
        
        {/* Priority & Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {task.priority && (
            <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${
              task.priority === 'Urgent' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
              task.priority === 'High' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
              task.priority === 'Medium' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
              'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
            }`}>
              {task.priority}
            </span>
          )}
          {(task.tags || []).map(tag => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md border bg-white/5 text-zinc-300 border-white/10">
              {tag}
            </span>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Progress</span>
            <span className="text-[10px] font-bold text-zinc-400">{task.progress}%</span>
          </div>
          <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: `${task.progress}%` }} 
              className={`h-full rounded-full shadow-[0_0_10px_rgba(59,130,246,0.3)] ${task.status === 'Done' ? 'bg-emerald-500' : 'bg-blue-500'}`} 
            />
          </div>
        </div>
        
        {(task.dependencies || []).length > 0 && (
          <div className="mb-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Dependencies:</p>
            <div className="flex flex-wrap gap-1">
              {task.dependencies.map(depId => {
                const depTask = tasks.find(t => t.id === depId);
                const isDepDone = depTask?.status === 'Done';
                return (
                  <span key={depId} className={`text-[10px] px-2 py-0.5 rounded-md border ${isDepDone ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {depTask?.title || 'Unknown'}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center text-xs font-medium text-zinc-400">
            <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold mr-2 text-[10px]">
              {task.assignee.charAt(0)}
            </div>
            {task.assignee}
          </div>
          <div className="flex items-center space-x-3">
            {(task.comments || []).length > 0 && (
              <span className="flex items-center text-xs text-zinc-500">
                <MessageSquare className="w-3 h-3 mr-1" /> {task.comments.length}
              </span>
            )}
            <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
              +{task.xpReward} XP
            </span>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="p-8 h-full flex flex-col relative">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">{useAppContext().settings?.section_tasks || 'Tasks & Projects'}</h1>
          <p className="text-zinc-400">Manage dependencies, collaborate, and earn XP.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-2 rounded-lg mr-4">
              {error}
            </div>
          )}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search tasks, users..." 
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
          <Button onClick={() => setIsNewTaskModalOpen(true)} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      </motion.header>

      {/* Notifications Panel (Simulated) */}
      <div className="absolute top-8 right-8 w-80 z-40 pointer-events-none">
        <AnimatePresence>
          {notifications.slice(0, 3).map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-xl p-4 mb-3 shadow-2xl pointer-events-auto flex items-start"
            >
              <div className="bg-blue-500/20 p-2 rounded-lg mr-3">
                <Bell className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-white font-medium">{notif.text}</p>
                <p className="text-xs text-zinc-500 mt-1">{notif.time.toLocaleTimeString()}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex space-x-6 min-w-max h-full">
            {(['Todo', 'In Progress', 'Done'] as const).map((status) => (
              <div 
                key={status} 
                className="w-80 flex flex-col bg-white/[0.02] backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
              >
                <div className="p-5 border-b border-white/5 flex justify-between items-center">
                  <h3 className="font-bold text-white tracking-wide">{status}</h3>
                  <span className="bg-white/10 text-zinc-300 text-xs font-bold px-2.5 py-1 rounded-full border border-white/10">
                    {tasks.filter(t => t.status === status).length}
                  </span>
                </div>
                <div className="p-4 flex-1 overflow-y-auto space-y-4">
                  <AnimatePresence>
                    {filteredTasks.filter(t => t.status === status).map(renderTaskCard)}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard Sidebar */}
        <div className="w-80 flex flex-col bg-white/[0.02] backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden shrink-0">
          <div className="p-5 border-b border-white/5 flex justify-between items-center bg-black/20">
            <h3 className="font-bold text-white tracking-wide flex items-center">
              <Trophy className="w-5 h-5 mr-2 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
              Leaderboard
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence>
              {leaderboard.map((member, index) => (
                <motion.div 
                  key={member.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 flex items-center relative overflow-hidden shadow-lg"
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${index === 0 ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]' : index === 1 ? 'bg-zinc-300' : index === 2 ? 'bg-amber-600' : 'bg-transparent'}`} />
                  
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/10 mr-3 shrink-0">
                    <Image src={member.avatar} alt={member.name} fill className="object-cover" referrerPolicy="no-referrer" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white truncate flex items-center">
                      {member.name}
                      {index === 0 && <Flame className="w-3.5 h-3.5 ml-1.5 text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />}
                    </h4>
                    <div className="text-xs font-bold text-blue-400 mt-0.5">
                      {member.xp.toLocaleString()} XP
                    </div>
                  </div>
                  
                  <div className="text-lg font-black text-white/20 ml-2">
                    #{index + 1}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Floating XP Popups */}
      <AnimatePresence>
        {xpPopups.map(popup => (
          <motion.div
            key={popup.id}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: 1, y: -100, scale: 1.2 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="fixed z-50 pointer-events-none text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]"
            style={{ left: popup.x, top: popup.y, transform: 'translate(-50%, -50%)' }}
          >
            +{popup.xp} XP
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Task Details Modal */}
      <Modal isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} title="Task Details">
        {selectedTask && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">{selectedTask.title}</h3>
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-zinc-400">Assignee: <span className="text-white font-medium">{selectedTask.assignee}</span></span>
                <span className="text-zinc-400">Reward: <span className="text-blue-400 font-bold">+{selectedTask.xpReward} XP</span></span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Status</label>
              <select 
                value={selectedTask.status}
                onChange={(e) => handleStatusChange(selectedTask.id, e.target.value as Task['status'])}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              >
                <option value="Todo" className="bg-slate-900">Todo</option>
                <option value="In Progress" className="bg-slate-900">In Progress</option>
                <option value="Done" className="bg-slate-900">Done</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Priority</label>
                <select 
                  value={selectedTask.priority || 'Medium'}
                  onChange={(e) => {
                    const updatedTask = { ...selectedTask, priority: e.target.value as any };
                    socket?.emit('update_task', updatedTask);
                    setSelectedTask(updatedTask);
                  }}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                >
                  <option value="Low" className="bg-slate-900">Low</option>
                  <option value="Medium" className="bg-slate-900">Medium</option>
                  <option value="High" className="bg-slate-900">High</option>
                  <option value="Urgent" className="bg-slate-900">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Est. Hours</label>
                <input 
                  type="number" 
                  value={selectedTask.estimatedHours || ''}
                  onChange={(e) => {
                    const updatedTask = { ...selectedTask, estimatedHours: e.target.value ? parseFloat(e.target.value) : undefined };
                    socket?.emit('update_task', updatedTask);
                    setSelectedTask(updatedTask);
                  }}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all" 
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Due Date</label>
                <input 
                  type="date" 
                  value={selectedTask.dueDate || ''}
                  onChange={(e) => {
                    const updatedTask = { ...selectedTask, dueDate: e.target.value || undefined };
                    socket?.emit('update_task', updatedTask);
                    setSelectedTask(updatedTask);
                  }}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Recurring</label>
                <select 
                  value={selectedTask.recurring || 'None'}
                  onChange={(e) => {
                    const updatedTask = { ...selectedTask, recurring: e.target.value as any };
                    socket?.emit('update_task', updatedTask);
                    setSelectedTask(updatedTask);
                  }}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                >
                  <option value="None" className="bg-slate-900">None</option>
                  <option value="Daily" className="bg-slate-900">Daily</option>
                  <option value="Weekly" className="bg-slate-900">Weekly</option>
                  <option value="Monthly" className="bg-slate-900">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Time Spent (hrs)</label>
                <input 
                  type="number" 
                  value={selectedTask.timeSpent || 0}
                  onChange={(e) => {
                    const updatedTask = { ...selectedTask, timeSpent: e.target.value ? parseFloat(e.target.value) : 0 };
                    socket?.emit('update_task', updatedTask);
                    setSelectedTask(updatedTask);
                  }}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Tags (comma separated)</label>
              <input 
                type="text" 
                value={(selectedTask.tags || []).join(', ')}
                onChange={(e) => {
                  const updatedTask = { ...selectedTask, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) };
                  socket?.emit('update_task', updatedTask);
                  setSelectedTask(updatedTask);
                }}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all" 
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest">Progress</label>
                <span className="text-sm font-bold text-blue-400">{selectedTask.progress}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={selectedTask.progress}
                onChange={(e) => handleProgressChange(selectedTask.id, parseInt(e.target.value))}
                className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Dependencies</label>
              <div className="space-y-2 max-h-40 overflow-y-auto bg-black/10 p-3 rounded-xl border border-white/5">
                {tasks.filter(t => t.id !== selectedTask.id).map(t => (
                  <label key={t.id} className="flex items-center space-x-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={(selectedTask.dependencies || []).includes(t.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (hasCircularDependency(selectedTask.id, t.id, tasks)) {
                            alert('Cannot add this dependency as it would create a circular dependency!');
                            return;
                          }
                          const updatedDeps = Array.from(new Set([...selectedTask.dependencies, t.id]));
                          const updatedTask = { ...selectedTask, dependencies: updatedDeps };
                          socket?.emit('update_task', updatedTask);
                          setSelectedTask(updatedTask);
                        } else {
                          const updatedDeps = selectedTask.dependencies.filter(id => id !== t.id);
                          const updatedTask = { ...selectedTask, dependencies: updatedDeps };
                          socket?.emit('update_task', updatedTask);
                          setSelectedTask(updatedTask);
                        }
                      }}
                      className="rounded border-white/20 bg-black/40 text-blue-500 focus:ring-blue-500/50"
                    />
                    <span className="text-sm text-zinc-300">{t.title}</span>
                  </label>
                ))}
                {tasks.length <= 1 && <p className="text-xs text-zinc-500 italic">No other tasks available.</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Subtasks</label>
              <div className="space-y-2 mb-3">
                {(selectedTask.subtasks || []).map(subtask => (
                  <div key={subtask.id} className="flex items-center space-x-3 bg-white/5 p-2 rounded-lg border border-white/5">
                    <input 
                      type="checkbox" 
                      checked={subtask.completed}
                      onChange={(e) => {
                        const updatedSubtasks = (selectedTask.subtasks || []).map(st => 
                          st.id === subtask.id ? { ...st, completed: e.target.checked } : st
                        );
                        const updatedTask = { ...selectedTask, subtasks: updatedSubtasks };
                        socket?.emit('update_task', updatedTask);
                        setSelectedTask(updatedTask);
                      }}
                      className="rounded border-white/20 bg-black/40 text-blue-500 focus:ring-blue-500/50"
                    />
                    <span className={`text-sm flex-1 ${subtask.completed ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
                      {subtask.title}
                    </span>
                    <button 
                      onClick={() => {
                        const updatedSubtasks = (selectedTask.subtasks || []).filter(st => st.id !== subtask.id);
                        const updatedTask = { ...selectedTask, subtasks: updatedSubtasks };
                        socket?.emit('update_task', updatedTask);
                        setSelectedTask(updatedTask);
                      }}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex space-x-2">
                <input 
                  type="text" 
                  id="new-subtask-input"
                  placeholder="Add a subtask..." 
                  className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-zinc-600"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.currentTarget;
                      if (!input.value.trim()) return;
                      const newSubtask: Subtask = {
                        id: Math.random().toString(36).substr(2, 9),
                        title: input.value.trim(),
                        completed: false
                      };
                      const updatedTask = { ...selectedTask, subtasks: [...(selectedTask.subtasks || []), newSubtask] };
                      socket?.emit('update_task', updatedTask);
                      setSelectedTask(updatedTask);
                      input.value = '';
                    }
                  }}
                />
                <Button 
                  variant="secondary" 
                  className="px-3 py-2"
                  onClick={() => {
                    const input = document.getElementById('new-subtask-input') as HTMLInputElement;
                    if (!input || !input.value.trim()) return;
                    const newSubtask: Subtask = {
                      id: Math.random().toString(36).substr(2, 9),
                      title: input.value.trim(),
                      completed: false
                    };
                    const updatedTask = { ...selectedTask, subtasks: [...(selectedTask.subtasks || []), newSubtask] };
                    socket?.emit('update_task', updatedTask);
                    setSelectedTask(updatedTask);
                    input.value = '';
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Comments Section */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Team Comments</label>
              <div className="space-y-3 max-h-40 overflow-y-auto mb-3 pr-2">
                {(selectedTask.comments || []).length === 0 ? (
                  <p className="text-sm text-zinc-500 italic">No comments yet. Start the discussion!</p>
                ) : (
                  (selectedTask.comments || []).map(c => (
                    <div key={c.id} className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-white">{c.author}</span>
                        <span className="text-[10px] text-zinc-500">{c.timestamp.toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm text-zinc-300">
                        {/* Highlight @mentions */}
                        {c.text.split(/(@\w+)/g).map((part, i) => 
                          part.startsWith('@') ? <span key={i} className="text-blue-400 font-medium">{part}</span> : part
                        )}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleAddComment} className="flex space-x-2">
                <input 
                  type="text" 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Type a comment... use @ to mention" 
                  className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-zinc-600"
                />
                <Button type="submit" variant="secondary" className="px-3 py-2">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        )}
      </Modal>

      {/* New Task Modal */}
      <Modal isOpen={isNewTaskModalOpen} onClose={() => setIsNewTaskModalOpen(false)} title="Create New Task">
        <form onSubmit={handleAddTask} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Task Title</label>
            <input 
              type="text" 
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="e.g. Update API Endpoints" 
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-zinc-600" 
              required 
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Assignee</label>
            <select 
              value={newTaskAssignee}
              onChange={(e) => setNewTaskAssignee(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
            >
              <option value="" className="bg-slate-900">Select Assignee (Default: You)</option>
              {users.map(u => (
                <option key={u.id} value={u.name} className="bg-slate-900">{u.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Priority</label>
              <select 
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as any)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              >
                <option value="Low" className="bg-slate-900">Low</option>
                <option value="Medium" className="bg-slate-900">Medium</option>
                <option value="High" className="bg-slate-900">High</option>
                <option value="Urgent" className="bg-slate-900">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Est. Hours</label>
              <input 
                type="number" 
                value={newTaskEstimatedHours}
                onChange={(e) => setNewTaskEstimatedHours(e.target.value)}
                placeholder="e.g. 4" 
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-zinc-600" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Due Date</label>
              <input 
                type="date" 
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-zinc-600" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Recurring</label>
              <select 
                value={newTaskRecurring}
                onChange={(e) => setNewTaskRecurring(e.target.value as any)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              >
                <option value="None" className="bg-slate-900">None</option>
                <option value="Daily" className="bg-slate-900">Daily</option>
                <option value="Weekly" className="bg-slate-900">Weekly</option>
                <option value="Monthly" className="bg-slate-900">Monthly</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Tags (comma separated)</label>
            <input 
              type="text" 
              value={newTaskTags}
              onChange={(e) => setNewTaskTags(e.target.value)}
              placeholder="e.g. Bug, Feature, Marketing" 
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-zinc-600" 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Dependencies (Optional)</label>
            <div className="space-y-2 max-h-40 overflow-y-auto bg-black/10 p-3 rounded-xl border border-white/5">
              {tasks.map(t => (
                <label key={t.id} className="flex items-center space-x-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    checked={newTaskDependencies.includes(t.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewTaskDependencies(Array.from(new Set([...newTaskDependencies, t.id])));
                      } else {
                        setNewTaskDependencies(newTaskDependencies.filter(id => id !== t.id));
                      }
                    }}
                    className="rounded border-white/20 bg-black/40 text-blue-500 focus:ring-blue-500/50"
                  />
                  <span className="text-sm text-zinc-300">{t.title}</span>
                </label>
              ))}
              {tasks.length === 0 && <p className="text-xs text-zinc-500 italic">No existing tasks to depend on.</p>}
            </div>
          </div>

          <Button type="submit" className="w-full mt-6">
            Create Task
          </Button>
        </form>
      </Modal>
    </div>
  );
}
