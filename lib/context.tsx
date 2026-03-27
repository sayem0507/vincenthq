'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  xp: number;
};

type AppContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  socket: any | null;
  onlineUsers: User[];
  tasks: any[];
  leads: any[];
  posts: any[];
  users: User[];
  dailyUpdates: any[];
  settings: Record<string, string>;
  logout: () => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      const storedNotifs = localStorage.getItem('notificationsEnabled');
      try {
        if (storedUser) {
          setTimeout(() => setUser(JSON.parse(storedUser)), 0);
        }
        if (storedNotifs !== null) {
          setTimeout(() => setNotificationsEnabled(storedNotifs === 'true'), 0);
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const toggleNotifications = useCallback((enabled: boolean) => {
    setNotificationsEnabled(enabled);
    localStorage.setItem('notificationsEnabled', String(enabled));
  }, []);

  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dailyUpdates, setDailyUpdates] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({
    software_name: 'GrowthGrid',
    section_dashboard: 'Command Center',
    section_arena: 'The Arena',
    section_tasks: 'Active Missions',
    section_leads: 'Lead Pipeline',
    section_content: 'Content Engine'
  });

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch('/api/data', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        return;
      }
      
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setLeads(data.leads || []);
        setPosts(data.posts || []);
        setUsers(data.users || []);
        setDailyUpdates(data.dailyUpdates || []);
        setOnlineUsers(data.onlineUsers || []); 
        if (data.settings) {
          setSettings(data.settings);
        }
        
        // Update current user if it changed
        setUser(prevUser => {
          if (!prevUser) return prevUser;
          const updatedCurrentUser = data.users?.find((u: User) => u.id === prevUser.id);
          if (updatedCurrentUser) {
            const { lastActive: _new, ...newUserData } = updatedCurrentUser as any;
            const { lastActive: _old, ...oldUserData } = prevUser as any;
            
            // Compare relevant fields to avoid infinite loops due to key order
            const hasChanged = 
              newUserData.id !== oldUserData.id ||
              newUserData.name !== oldUserData.name ||
              newUserData.email !== oldUserData.email ||
              newUserData.role !== oldUserData.role ||
              newUserData.avatar !== oldUserData.avatar ||
              newUserData.xp !== oldUserData.xp;

            if (hasChanged) {
              localStorage.setItem('user', JSON.stringify(updatedCurrentUser));
              return updatedCurrentUser;
            }
          }
          return prevUser;
        });
      }
    } catch (e) {
      console.error('Failed to fetch data', e);
    }
  }, []);

  // Fake socket for Vercel compatibility (REST + Polling)
  const socket = useMemo(() => {
    return {
      emit: async (event: string, payload?: any) => {
        if (event === 'authenticate') return;
        if (event === 'get_initial_data') {
          fetchData();
          return;
        }

        // Optimistic updates for deletes to make it feel instant
        const id = typeof payload === 'object' ? payload?.id : payload;
        if (event === 'delete_task') {
          setTasks(prev => {
            const filtered = prev.filter(t => t.id !== id);
            // Also remove this task from any dependencies
            return filtered.map(t => ({
              ...t,
              dependencies: t.dependencies?.filter((depId: string) => depId !== id) || []
            }));
          });
        }
        if (event === 'delete_user') setUsers(prev => prev.filter(u => u.id !== id));
        if (event === 'user_added') {
          setUsers(prev => {
            if (!prev.find(u => u.id === payload.id)) {
              return [...prev, payload];
            }
            return prev;
          });
        }
        if (event === 'update_user') {
          setUsers(prev => prev.map(u => u.id === payload.id ? { ...u, ...payload } : u));
        }
        if (event === 'delete_post') setPosts(prev => prev.filter(p => p.id !== id));
        if (event === 'delete_lead') setLeads(prev => prev.filter(l => l.id !== id));
        if (event === 'delete_daily_update') setDailyUpdates(prev => prev.filter(u => u.id !== id));
        
        if (event === 'add_daily_update') {
          setDailyUpdates(prev => [payload, ...prev]);
        }
        
        if (event === 'update_daily_update') {
          setDailyUpdates(prev => prev.map(u => u.id === payload.id ? payload : u));
        }
        
        if (event === 'update_lead') {
          setLeads(prev => {
            const exists = prev.find(l => l.id === payload.id);
            if (exists) return prev.map(l => l.id === payload.id ? payload : l);
            return [...prev, payload];
          });
        }
        
        if (event === 'update_task') {
          setTasks(prev => {
            const exists = prev.find(t => t.id === payload.id);
            if (exists) return prev.map(t => t.id === payload.id ? payload : t);
            return [...prev, payload];
          });
        }
        
        if (event === 'update_post') {
          setPosts(prev => {
            const exists = prev.find(p => p.id === payload.id);
            if (exists) return prev.map(p => p.id === payload.id ? payload : p);
            return [...prev, payload];
          });
        }
        
        if (event === 'clear_all_data') {
          if (payload === 'tasks') setTasks([]);
          if (payload === 'leads') setLeads([]);
          if (payload === 'posts') setPosts([]);
        }
        
        if (event === 'full_reset') {
          setTasks([]);
          setLeads([]);
          setPosts([]);
          setUsers(prev => prev.filter(u => u.role === 'admin'));
        }
        
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
          const res = await fetch('/api/action', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ action: event, payload })
          });
          
          if (res.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            return;
          }
          
          // Refresh data immediately after mutation
          fetchData();
        } catch (e) {
          console.error('Action failed', e);
        }
      },
      on: () => {},
      off: () => {},
      disconnect: () => {}
    };
  }, [fetchData]);

  useEffect(() => {
    if (user) {
      setTimeout(() => fetchData(), 0);
      // Poll every 5 seconds for real-time feel
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [user, fetchData]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AppContext.Provider value={{ user, setUser, socket, onlineUsers, tasks, leads, posts, users, dailyUpdates, settings, logout, notificationsEnabled, setNotificationsEnabled: toggleNotifications }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
