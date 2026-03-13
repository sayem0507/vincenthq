'use client';

import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Heart, MessageCircle, Share2, MoreHorizontal, Image as ImageIcon, Send, Edit2, Trash2, X } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';

export default function FeedPage() {
  const { user, dailyUpdates, socket } = useAppContext();
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostText, setEditPostText] = useState('');
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleAddComment = (post: any) => {
    const text = commentTexts[post.id];
    if (!text || !text.trim() || !user) return;

    const newComment = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      text: text.trim(),
      createdAt: new Date().toISOString()
    };

    socket?.emit('update_daily_update', {
      ...post,
      comments: [...(post.comments || []), newComment]
    });

    setCommentTexts(prev => ({ ...prev, [post.id]: '' }));
  };

  const handleDeleteComment = (post: any, commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    socket?.emit('update_daily_update', {
      ...post,
      comments: post.comments.filter((c: any) => c.id !== commentId)
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPostImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim() && !newPostImage) return;
    
    socket?.emit('add_daily_update', {
      id: crypto.randomUUID(),
      userId: user?.id,
      userName: user?.name,
      text: newPostText,
      imageUrl: newPostImage,
      likes: []
    });
    
    setNewPostText('');
    setNewPostImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLike = (post: any) => {
    if (!user) return;
    const likes = post.likes || [];
    const hasLiked = likes.includes(user.id);
    const newLikes = hasLiked ? likes.filter((id: string) => id !== user.id) : [...likes, user.id];
    
    socket?.emit('update_daily_update', {
      ...post,
      likes: newLikes
    });
  };

  const handleDelete = (postId: string) => {
    if (confirm('Are you sure you want to delete this post?')) {
      socket?.emit('delete_daily_update', postId);
    }
  };

  const handleEditSave = (post: any) => {
    socket?.emit('update_daily_update', {
      ...post,
      text: editPostText
    });
    setEditingPostId(null);
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto h-full overflow-y-auto">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Team Feed</h1>
        <p className="text-zinc-400">Share updates, ideas, and wins with the team.</p>
      </motion.header>

      {/* Create Post */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 mb-8 backdrop-blur-xl"
      >
        <div className="flex gap-4">
          <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
            <Image src={user?.avatar || 'https://i.pravatar.cc/150'} alt="Avatar" fill className="object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="flex-1">
            <textarea
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full bg-transparent border-none focus:ring-0 text-white placeholder:text-zinc-500 resize-none min-h-[80px]"
            />
            {newPostImage && (
              <div className="relative mt-2 rounded-xl overflow-hidden border border-white/10 inline-block">
                <Image 
                  src={newPostImage} 
                  alt="Upload preview" 
                  width={500} 
                  height={300} 
                  className="max-h-64 w-auto object-contain" 
                  unoptimized 
                />
                <button 
                  onClick={() => setNewPostImage(null)}
                  className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
              <div className="flex gap-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-colors"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
              <button 
                onClick={handlePost}
                disabled={!newPostText.trim() && !newPostImage}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Send className="w-4 h-4 mr-2" />
                Post
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Feed */}
      <div className="space-y-6">
        {dailyUpdates.map((post, i) => {
          const isAuthor = user?.id === post.userId;
          const likes = post.likes || [];
          const hasLiked = user ? likes.includes(user.id) : false;
          
          return (
            <motion.div 
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 backdrop-blur-xl"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/10">
                    <Image src={`https://i.pravatar.cc/150?u=${post.userId}`} alt={post.userName} fill className="object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{post.userName}</h3>
                    <p className="text-xs text-zinc-500">
                      {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : 'Just now'}
                    </p>
                  </div>
                </div>
                {isAuthor && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingPostId(post.id);
                        setEditPostText(post.text);
                      }}
                      className="p-2 text-zinc-500 hover:text-white transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(post.id)}
                      className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {editingPostId === post.id ? (
                <div className="mb-4">
                  <textarea
                    value={editPostText}
                    onChange={(e) => setEditPostText(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500/50 min-h-[80px]"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button 
                      onClick={() => setEditingPostId(null)}
                      className="px-3 py-1 text-sm text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => handleEditSave(post)}
                      className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-300 mb-4 whitespace-pre-wrap">{post.text}</p>
              )}

              {post.imageUrl && (
                <div className="relative rounded-xl overflow-hidden border border-white/10 mb-4">
                  <Image 
                    src={post.imageUrl} 
                    alt="Post attachment" 
                    width={800} 
                    height={600} 
                    className="w-full h-auto object-cover" 
                    unoptimized 
                  />
                </div>
              )}

              <div className="flex items-center gap-6 pt-4 border-t border-white/10">
                <button 
                  onClick={() => handleLike(post)}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${hasLiked ? 'text-pink-500' : 'text-zinc-400 hover:text-pink-400'}`}
                >
                  <Heart className={`w-5 h-5 ${hasLiked ? 'fill-current' : ''}`} />
                  {likes.length > 0 && <span>{likes.length}</span>}
                </button>
                <button 
                  onClick={() => toggleComments(post.id)}
                  className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-blue-400 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  {post.comments?.length || 0} Comments
                </button>
                <button className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors">
                  <Share2 className="w-5 h-5" />
                  Share
                </button>
              </div>

              {/* Comments Section */}
              {expandedComments[post.id] && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t border-white/10 space-y-4"
                >
                  {post.comments?.map((comment: any) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
                        <Image src={comment.userAvatar || `https://i.pravatar.cc/150?u=${comment.userId}`} alt={comment.userName} fill className="object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 bg-white/5 rounded-2xl rounded-tl-none p-3">
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="font-semibold text-sm text-white">{comment.userName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500">
                              {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : 'Just now'}
                            </span>
                            {(user?.id === comment.userId || user?.role === 'admin') && (
                              <button 
                                onClick={() => handleDeleteComment(post, comment.id)}
                                className="text-zinc-500 hover:text-red-400 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-zinc-300">{comment.text}</p>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex gap-3 mt-4">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
                      <Image src={user?.avatar || 'https://i.pravatar.cc/150'} alt="Avatar" fill className="object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={commentTexts[post.id] || ''}
                        onChange={(e) => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddComment(post);
                          }
                        }}
                        placeholder="Write a comment..."
                        className="w-full bg-black/20 border border-white/10 rounded-full pl-4 pr-10 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                      />
                      <button 
                        onClick={() => handleAddComment(post)}
                        disabled={!commentTexts[post.id]?.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-full disabled:opacity-50 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
        {dailyUpdates.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            No posts yet. Be the first to share something!
          </div>
        )}
      </div>
    </div>
  );
}
