'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import { Send, Image as ImageIcon, X, Users, MessageSquare, Hash, Circle, Volume2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useAppContext } from '@/lib/context';
import Image from 'next/image';
import { VoiceRoom } from '@/components/VoiceRoom';

export default function ChatPage() {
  const { user, users, onlineUsers, dailyUpdates, socket } = useAppContext();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<string>('general'); // 'general', 'random', 'voice_general', or userId

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch('/api/chat');
        if (!res.ok) throw new Error('Failed to fetch messages');
        const data = await res.json();
        setMessages(data.messages || []);
        scrollToBottom();
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };
    fetchMessages();

    const newSocket = io();
    socketRef.current = newSocket;

    newSocket.on('receive_message', (message) => {
      setMessages((prev) => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
      scrollToBottom();
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !imagePreview) || !user) return;

    const messageData = {
      id: crypto.randomUUID(),
      senderId: user.id,
      senderName: user.name,
      senderAvatar: user.avatar,
      recipientId: (activeChannel === 'general' || activeChannel === 'random') ? null : activeChannel,
      channel: (activeChannel === 'general' || activeChannel === 'random') ? activeChannel : null,
      text: newMessage.trim(),
      imageUrl: imagePreview,
      createdAt: new Date().toISOString(),
    };

    // Optimistically add message
    setMessages((prev) => [...prev, messageData]);
    setNewMessage('');
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    scrollToBottom();

    // Emit to others
    socketRef.current?.emit('send_message', messageData);

    // Save to DB
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  const filteredMessages = useMemo(() => {
    if (activeChannel === 'general' || activeChannel === 'random') {
      return messages.filter(m => !m.recipientId && m.channel === activeChannel);
    }
    // 1-on-1 chat
    return messages.filter(m => 
      (m.senderId === user?.id && m.recipientId === activeChannel) ||
      (m.senderId === activeChannel && m.recipientId === user?.id)
    );
  }, [messages, activeChannel, user]);

  const activeUser = users.find(u => u.id === activeChannel);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-[calc(100vh-4rem)] flex gap-6">
      {/* Sidebar */}
      <div className="w-64 bg-[#2B2D31] rounded-l-2xl flex flex-col overflow-hidden hidden md:flex border-r border-white/5">
        <div className="p-4 border-b border-black/20 shadow-sm">
          <h2 className="text-base font-bold text-white flex items-center">
            Team Server
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto py-3 custom-scrollbar">
          <div className="mb-4">
            <div className="px-4 flex items-center justify-between group cursor-pointer mb-1">
              <p className="text-xs font-semibold text-[#949BA4] uppercase tracking-wide group-hover:text-zinc-300 transition-colors">Text Channels</p>
            </div>
            <div className="space-y-[2px] px-2">
              <button
                onClick={() => setActiveChannel('general')}
                className={`w-full flex items-center px-2 py-1.5 rounded text-sm font-medium transition-colors ${activeChannel === 'general' ? 'bg-[#3F4147] text-white' : 'text-[#949BA4] hover:bg-[#35373C] hover:text-zinc-300'}`}
              >
                <Hash className="w-5 h-5 mr-1.5 text-[#80848E]" />
                general
              </button>
              <button
                onClick={() => setActiveChannel('random')}
                className={`w-full flex items-center px-2 py-1.5 rounded text-sm font-medium transition-colors ${activeChannel === 'random' ? 'bg-[#3F4147] text-white' : 'text-[#949BA4] hover:bg-[#35373C] hover:text-zinc-300'}`}
              >
                <Hash className="w-5 h-5 mr-1.5 text-[#80848E]" />
                random
              </button>
            </div>
          </div>

          <div className="mb-4">
            <div className="px-4 flex items-center justify-between group cursor-pointer mb-1">
              <p className="text-xs font-semibold text-[#949BA4] uppercase tracking-wide group-hover:text-zinc-300 transition-colors">Voice Channels</p>
            </div>
            <div className="space-y-[2px] px-2">
              <VoiceRoom 
                channelId="general" 
                isActive={activeChannel === 'voice_general'} 
                onJoin={() => setActiveChannel('voice_general')} 
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="px-4 flex items-center justify-between group cursor-pointer mb-1">
              <p className="text-xs font-semibold text-[#949BA4] uppercase tracking-wide group-hover:text-zinc-300 transition-colors">Direct Messages</p>
            </div>
            <div className="space-y-[2px] px-2">
            {users.filter(u => u.id !== user?.id).map(u => {
              const isOnline = onlineUsers.some(ou => ou.id === u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => setActiveChannel(u.id)}
                  className={`w-full flex items-center px-2 py-1.5 rounded text-sm font-medium transition-colors ${activeChannel === u.id ? 'bg-[#3F4147] text-white' : 'text-[#949BA4] hover:bg-[#35373C] hover:text-zinc-300'}`}
                >
                  <div className="relative w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0">
                    <Image src={u.avatar} alt={u.name} fill className="object-cover" referrerPolicy="no-referrer" />
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#2B2D31] ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                  </div>
                  <span className="truncate flex-1 text-left">{u.name}</span>
                </button>
              );
            })}
            </div>
          </div>
        </div>
        
        {/* User Profile Area (Discord style bottom bar) */}
        <div className="bg-[#232428] p-1.5 flex items-center">
          <div className="flex items-center hover:bg-[#3F4147] p-1 rounded-md cursor-pointer transition-colors flex-1 min-w-0">
            <div className="relative w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0">
              <Image src={user?.avatar || 'https://i.pravatar.cc/150'} alt={user?.name || 'User'} fill className="object-cover" referrerPolicy="no-referrer" />
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#232428] bg-green-500"></div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate leading-tight">{user?.name}</p>
              <p className="text-xs text-[#949BA4] truncate leading-tight">Online</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-[#313338] rounded-r-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-black/20 shadow-sm flex items-center h-14">
          {activeChannel === 'general' && (
            <>
              <Hash className="w-6 h-6 text-[#80848E] mr-2" />
              <div>
                <h3 className="font-bold text-white text-base">general</h3>
              </div>
            </>
          )}
          {activeChannel === 'random' && (
            <>
              <Hash className="w-6 h-6 text-[#80848E] mr-2" />
              <div>
                <h3 className="font-bold text-white text-base">random</h3>
              </div>
            </>
          )}
          {activeChannel === 'voice_general' && (
            <>
              <Volume2 className="w-6 h-6 text-emerald-400 mr-2" />
              <div>
                <h3 className="font-bold text-white text-base">Voice Channel</h3>
              </div>
            </>
          )}
          {activeUser && (
            <>
              <div className="relative w-8 h-8 rounded-full overflow-hidden mr-3 flex-shrink-0">
                <Image src={activeUser.avatar} alt={activeUser.name} fill className="object-cover" referrerPolicy="no-referrer" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">{activeUser.name}</h3>
              </div>
            </>
          )}
        </div>

        {/* Messages Area */}
        {activeChannel === 'voice_general' ? (
          <div id="voice-video-container" className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#1E1F22] flex flex-col justify-center items-center">
            {/* Portal target for VoiceRoom videos */}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {filteredMessages.map((msg, idx) => {
            const isMe = msg.senderId === user?.id;
            const senderId = msg.senderId;
            const senderName = msg.senderName;
            const senderAvatar = msg.senderAvatar;

            const showAvatar = idx === 0 || (filteredMessages[idx - 1].senderId !== msg.senderId);
            const isConsecutive = !showAvatar;

            return (
              <div key={msg.id} className={`flex hover:bg-[#2E3035] px-4 py-1 -mx-4 ${isConsecutive ? 'mt-0' : 'mt-4'}`}>
                {/* Avatar */}
                <div className="flex-shrink-0 mr-4 w-10">
                  {showAvatar ? (
                    <div className="relative w-10 h-10 rounded-full overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                      <Image src={senderAvatar || `https://i.pravatar.cc/150?u=${senderId}`} alt={senderName || 'User'} fill className="object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <div className="w-10 text-right opacity-0 hover:opacity-100">
                      <span className="text-[10px] text-[#949BA4] mr-2">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Message Content */}
                <div className="flex flex-col flex-1 min-w-0">
                  {showAvatar && (
                    <div className="flex items-baseline mb-1">
                      <span className="text-base font-medium text-white mr-2 cursor-pointer hover:underline">{senderName}</span>
                      <span className="text-xs text-[#949BA4]">
                        {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  <div className="text-[#DBDEE1] text-base leading-relaxed break-words">
                    {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                    {msg.imageUrl && (
                      <div className="mt-2 relative rounded-lg overflow-hidden max-w-sm cursor-pointer">
                        <Image src={msg.imageUrl} alt="Uploaded" width={400} height={300} className="w-full h-auto object-cover rounded-lg" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
          {filteredMessages.length === 0 && (
            <div className="h-full flex flex-col justify-end pb-4">
              <div className="mb-4">
                <div className="w-16 h-16 bg-[#4E5058] rounded-full flex items-center justify-center mb-4">
                  <Hash className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Welcome to #{activeChannel === 'general' ? 'general' : activeChannel === 'random' ? 'random' : activeUser?.name}
                </h1>
                <p className="text-[#949BA4] text-base">
                  This is the start of the #{activeChannel === 'general' ? 'general' : activeChannel === 'random' ? 'random' : activeUser?.name} channel.
                </p>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Input Area */}
        {activeChannel !== 'voice_general' && (
          <div className="px-4 pb-6 pt-2">
            <div className="bg-[#383A40] rounded-lg p-2">
              {imagePreview && (
                <div className="mb-3 relative inline-block p-2 bg-[#2B2D31] rounded-lg">
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden">
                    <Image src={imagePreview} alt="Preview" width={128} height={128} className="w-full h-full object-cover" />
                  </div>
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute -top-2 -right-2 bg-[#F23F42] text-white rounded-full p-1 shadow-lg hover:bg-[#DA373C] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <form onSubmit={sendMessage} className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-[#B5BAC1] hover:text-[#DBDEE1] rounded-full transition-colors flex-shrink-0 bg-[#4E5058] hover:bg-[#6D6F78]"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <div className="flex-1 relative">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e);
                      }
                    }}
                    placeholder={`Message #${activeChannel === 'general' ? 'general' : activeChannel === 'random' ? 'random' : activeUser?.name}`}
                    className="w-full bg-transparent border-none px-2 py-2 text-[#DBDEE1] placeholder:text-[#949BA4] focus:outline-none resize-none max-h-32 min-h-[40px] leading-relaxed"
                    rows={1}
                  />
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
