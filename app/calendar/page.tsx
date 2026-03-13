'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay,
  addWeeks, subWeeks, addDays, subDays, isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, CheckSquare, Users, Calendar as CalendarIcon, List, CalendarDays, Filter, LayoutGrid, AlignJustify, Plus } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

type ViewMode = 'month' | 'week' | 'day' | 'list';

export default function CalendarPage() {
  const { tasks, leads, posts, socket, users, user } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [activeFilters, setActiveFilters] = useState({ tasks: true, leads: true, posts: true });

  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [newEventCategory, setNewEventCategory] = useState<'task' | 'lead' | 'post'>('task');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  const events = useMemo(() => {
    const formattedEvents: any[] = [];
    
    if (activeFilters.tasks) {
      tasks?.forEach((task: any) => {
        if (task.dueDate) {
          formattedEvents.push({
            id: `task-due-${task.id}`, originalId: task.id, title: `Due: ${task.title}`,
            date: new Date(task.dueDate), type: 'task', status: task.status, dateField: 'dueDate',
            userName: task.userName, userId: task.userId
          });
        }
      });
    }

    if (activeFilters.leads) {
      leads?.forEach((lead: any) => {
        if (lead.createdAt) {
          formattedEvents.push({
            id: `lead-${lead.id}`, originalId: lead.id, title: `New Lead: ${lead.name}`,
            date: new Date(lead.createdAt), type: 'lead', status: lead.status, dateField: 'createdAt',
            userName: lead.userName, userId: lead.userId
          });
        }
      });
    }

    if (activeFilters.posts) {
      posts?.forEach((post: any) => {
        if (post.scheduledFor || post.createdAt) {
          formattedEvents.push({
            id: `post-${post.id}`, originalId: post.id, title: `Post: ${post.title}`,
            date: new Date(post.scheduledFor || post.createdAt), type: 'post', status: post.status, 
            dateField: post.scheduledFor ? 'scheduledFor' : 'createdAt',
            userName: post.userName, userId: post.userId
          });
        }
      });
    }

    return formattedEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [tasks, leads, posts, activeFilters]);

  const filteredEvents = useMemo(() => {
    if (selectedUserId === 'all') return events;
    return events.filter(e => e.userId === selectedUserId);
  }, [events, selectedUserId]);

  const nextDate = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else if (viewMode === 'day') setCurrentDate(addDays(currentDate, 1));
  };

  const prevDate = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else if (viewMode === 'day') setCurrentDate(subDays(currentDate, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  const getDaysForView = () => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(monthStart);
      return eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });
    } else if (viewMode === 'week') {
      return eachDayOfInterval({ start: startOfWeek(currentDate), end: endOfWeek(currentDate) });
    } else {
      return [currentDate];
    }
  };

  const days = getDaysForView();

  const handleDrop = async (e: React.DragEvent, day: Date) => {
    e.preventDefault();
    const eventDataStr = e.dataTransfer.getData('application/json');
    if (!eventDataStr) return;
    
    const eventData = JSON.parse(eventDataStr);
    if (!eventData.dateField) return;

    const newDateStr = day.toISOString();
    
    if (eventData.type === 'task' || eventData.type === 'task-done') {
      const task = tasks.find(t => t.id === eventData.originalId);
      if (task) socket?.emit('update_task', { ...task, [eventData.dateField]: newDateStr });
    } else if (eventData.type === 'lead') {
      const lead = leads.find(l => l.id === eventData.originalId);
      if (lead) socket?.emit('update_lead', { ...lead, [eventData.dateField]: newDateStr });
    } else if (eventData.type === 'post') {
      const post = posts.find(p => p.id === eventData.originalId);
      if (post) socket?.emit('update_post', { ...post, [eventData.dateField]: newDateStr });
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventDate || !user) return;
    
    setIsCreatingEvent(true);
    await new Promise(r => setTimeout(r, 600)); // Simulate network request
    
    if (newEventCategory === 'task') {
      const newTask = {
        id: crypto.randomUUID(),
        title: newEventTitle,
        status: 'todo',
        assignee: user.name,
        userId: user.id,
        userName: user.name,
        dueDate: new Date(newEventDate).toISOString(),
      };
      socket?.emit('update_task', newTask);
    } else if (newEventCategory === 'lead') {
      const newLead = {
        id: crypto.randomUUID(),
        name: newEventTitle,
        platform: 'X',
        status: 'Target Identified',
        assignee: user.name,
        userId: user.id,
        userName: user.name,
        createdAt: new Date(newEventDate).toISOString(),
      };
      socket?.emit('update_lead', newLead);
    } else if (newEventCategory === 'post') {
      const newPost = {
        id: crypto.randomUUID(),
        title: newEventTitle,
        platform: 'X',
        status: 'Scheduled',
        author: user.name,
        userId: user.id,
        userName: user.name,
        scheduledFor: new Date(newEventDate).toISOString(),
      };
      socket?.emit('update_post', newPost);
    }
    
    setNewEventTitle('');
    setNewEventDate('');
    setIsCreatingEvent(false);
    setIsNewEventModalOpen(false);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'task': return <CheckSquare className="w-3 h-3 mr-1" />;
      case 'lead': return <Users className="w-3 h-3 mr-1" />;
      case 'post': return <CalendarIcon className="w-3 h-3 mr-1" />;
      default: return null;
    }
  };

  const getEventColor = (type: string, status: string) => {
    if (type === 'task' && status === 'completed') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (type === 'task') return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (type === 'lead') return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    if (type === 'post') return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    return 'bg-zinc-800 text-zinc-300 border-zinc-700';
  };

  const toggleFilter = (key: keyof typeof activeFilters) => {
    setActiveFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col relative overflow-hidden">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4 shrink-0"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center">
            <CalendarDays className="w-8 h-8 mr-3 text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
            Calendar
          </h1>
          <p className="text-zinc-400">Schedule tasks, content, and track leads across your team.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={() => setIsNewEventModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Event
          </Button>
        </div>
      </motion.header>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Sidebar */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full lg:w-64 shrink-0 flex flex-col gap-6 overflow-y-auto pr-2"
        >
          {/* Mini Calendar (Visual only for now) */}
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white mb-4">{format(currentDate, 'MMMM yyyy')}</h3>
            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-zinc-500 font-medium">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {eachDayOfInterval({ start: startOfWeek(startOfMonth(currentDate)), end: endOfWeek(endOfMonth(currentDate)) }).map((day, i) => (
                <div 
                  key={i} 
                  onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                  className={`p-1.5 rounded-full cursor-pointer transition-colors ${isSameMonth(day, currentDate) ? 'text-zinc-300 hover:bg-white/10' : 'text-zinc-700'} ${isToday(day) ? 'bg-indigo-500 text-white hover:bg-indigo-400' : ''} ${isSameDay(day, currentDate) && !isToday(day) ? 'bg-white/20 text-white' : ''}`}
                >
                  {format(day, 'd')}
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 backdrop-blur-xl">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">Calendars</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input type="checkbox" checked={activeFilters.tasks} onChange={() => toggleFilter('tasks')} className="form-checkbox h-4 w-4 text-blue-500 rounded border-white/20 bg-black/20 focus:ring-0 focus:ring-offset-0 transition-colors" />
                <span className="text-sm text-zinc-300 group-hover:text-white transition-colors flex items-center"><CheckSquare className="w-4 h-4 mr-2 text-blue-400" /> Tasks</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input type="checkbox" checked={activeFilters.leads} onChange={() => toggleFilter('leads')} className="form-checkbox h-4 w-4 text-amber-500 rounded border-white/20 bg-black/20 focus:ring-0 focus:ring-offset-0 transition-colors" />
                <span className="text-sm text-zinc-300 group-hover:text-white transition-colors flex items-center"><Users className="w-4 h-4 mr-2 text-amber-400" /> Leads</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input type="checkbox" checked={activeFilters.posts} onChange={() => toggleFilter('posts')} className="form-checkbox h-4 w-4 text-purple-500 rounded border-white/20 bg-black/20 focus:ring-0 focus:ring-offset-0 transition-colors" />
                <span className="text-sm text-zinc-300 group-hover:text-white transition-colors flex items-center"><CalendarIcon className="w-4 h-4 mr-2 text-purple-400" /> Content</span>
              </label>
            </div>

            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mt-6 mb-4">Team Members</h3>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all"
            >
              <option value="all" className="bg-zinc-900">Everyone</option>
              {users?.map(u => (
                <option key={u.id} value={u.id} className="bg-zinc-900">{u.name}</option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Main Calendar Area */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl"
        >
          {/* Calendar Toolbar */}
          <div className="flex flex-wrap items-center justify-between p-4 border-b border-white/10 bg-black/20 gap-4">
            <div className="flex items-center space-x-4">
              <Button variant="secondary" onClick={goToToday} className="text-xs py-1.5 h-auto">Today</Button>
              <div className="flex items-center space-x-2">
                <button onClick={prevDate} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={nextDate} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <h2 className="text-xl font-bold text-white min-w-[150px]">
                {viewMode === 'day' ? format(currentDate, 'MMMM d, yyyy') : format(currentDate, 'MMMM yyyy')}
              </h2>
            </div>
            
            <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/5">
              {(['month', 'week', 'day', 'list'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${viewMode === mode ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <AnimatePresence mode="wait">
              {viewMode !== 'list' ? (
                <motion.div 
                  key={`grid-${viewMode}-${currentDate.toISOString()}`}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="min-h-full flex flex-col"
                >
                  {/* Days Header */}
                  <div className={`grid ${viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-7'} border-b border-white/10 bg-black/10 sticky top-0 z-10`}>
                    {(viewMode === 'day' ? [currentDate] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map((day, i) => (
                      <div key={i} className="py-3 text-center text-sm font-medium text-zinc-400 uppercase tracking-wider border-r border-white/5 last:border-r-0">
                        {viewMode === 'day' ? format(day as Date, 'EEEE') : String(day)}
                      </div>
                    ))}
                  </div>
                  
                  {/* Days Grid */}
                  <div className={`flex-1 grid ${viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-7'} auto-rows-[minmax(120px,1fr)]`}>
                    {days.map((day, dayIdx) => {
                      const dayEvents = filteredEvents.filter(e => isSameDay(e.date, day));
                      const isCurrentMonth = isSameMonth(day, currentDate);
                      const isTodayDate = isToday(day);
                      
                      return (
                        <div
                          key={day.toString()}
                          onDrop={(e) => handleDrop(e, day)}
                          onDragOver={(e) => e.preventDefault()}
                          className={`
                            min-h-[120px] p-2 border-b border-r border-white/5 transition-colors relative group
                            ${!isCurrentMonth && viewMode === 'month' ? 'bg-black/20 text-zinc-600' : 'bg-transparent text-zinc-300'}
                            ${(viewMode === 'day' || dayIdx % 7 === 6) ? 'border-r-0' : ''}
                            hover:bg-white/[0.04]
                          `}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className={`text-sm font-medium w-8 h-8 flex items-center justify-center rounded-full transition-all ${isTodayDate ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'group-hover:bg-white/10'}`}>
                              {format(day, 'd')}
                            </span>
                          </div>
                          <div className="space-y-1.5 max-h-[calc(100%-40px)] overflow-y-auto custom-scrollbar pr-1">
                            {dayEvents.map((event) => (
                              <motion.div
                                layoutId={`event-${event.id}`}
                                key={event.id}
                                draggable={!!event.dateField}
                                onDragStart={(e: any) => e.dataTransfer.setData('application/json', JSON.stringify(event))}
                                className={`
                                  text-xs p-2 rounded-lg border flex flex-col cursor-pointer shadow-sm
                                  ${getEventColor(event.type, event.status)}
                                  ${event.dateField ? 'hover:opacity-80 active:scale-95 transition-transform' : 'opacity-70'}
                                `}
                                title={event.title}
                              >
                                <div className="flex items-center">
                                  {getEventIcon(event.type)}
                                  <span className="truncate font-medium">{event.title}</span>
                                </div>
                                {event.userName && (
                                  <span className="text-[10px] opacity-70 mt-1 truncate flex items-center">
                                    <div className="w-3 h-3 rounded-full bg-white/20 mr-1 flex items-center justify-center text-[8px]">{event.userName.charAt(0)}</div>
                                    {event.userName}
                                  </span>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="list-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="p-6 space-y-4"
                >
                  {filteredEvents.length > 0 ? filteredEvents.map((event) => (
                    <div key={event.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${getEventColor(event.type, event.status)}`}>
                          {getEventIcon(event.type)}
                        </div>
                        <div>
                          <h4 className="text-white font-medium text-sm mb-1">{event.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-zinc-500">
                            <span>{format(event.date, 'MMM d, yyyy h:mm a')}</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                            <span className="uppercase tracking-wider">{event.type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="text-right">
                          <p className="text-sm text-white">{event.userName || 'Unknown'}</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 text-xs font-bold border border-indigo-500/30">
                          {event.userName?.charAt(0) || '?'}
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="py-20 text-center text-zinc-500">
                      <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>No events found for the selected filters.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <Modal 
        isOpen={isNewEventModalOpen} 
        onClose={() => setIsNewEventModalOpen(false)} 
        title="Create New Event"
      >
        <form onSubmit={handleCreateEvent} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Event Type</label>
            <select 
              value={newEventCategory}
              onChange={(e) => setNewEventCategory(e.target.value as any)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            >
              <option value="task" className="bg-slate-900">Task</option>
              <option value="lead" className="bg-slate-900">Lead</option>
              <option value="post" className="bg-slate-900">Content Post</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Title / Name</label>
            <input 
              type="text" 
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              placeholder={newEventCategory === 'task' ? 'e.g. Update API Endpoints' : newEventCategory === 'lead' ? 'e.g. @investor_john' : 'e.g. 5 No-Code Tools...'} 
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-600" 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Date & Time</label>
            <input 
              type="datetime-local" 
              value={newEventDate}
              onChange={(e) => setNewEventDate(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all" 
              required 
            />
          </div>
          <Button type="submit" className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white" isLoading={isCreatingEvent}>
            Create Event
          </Button>
        </form>
      </Modal>
    </div>
  );
}
