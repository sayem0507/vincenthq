'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Search, Plus, FileText, Folder, ChevronRight, MoreVertical, ArrowLeft, UploadCloud, File, Download, Edit3, Trash2, X } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { Button } from '@/components/ui/button';

type Doc = {
  id: string;
  title: string;
  category: string;
  lastUpdated: string;
  author: string;
  content?: string;
  type: 'text' | 'pdf' | 'doc';
  fileUrl?: string;
};

export default function DocsPage() {
  const { user } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [documents, setDocuments] = useState<Doc[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/documents')
      .then(res => res.json())
      .then(data => {
        setDocuments(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch documents', err);
        setIsLoading(false);
      });
  }, []);

  const categories = ['All', 'HR', 'Sales', 'Engineering', 'Marketing'];

  const filteredDocs = documents.filter(doc => 
    (activeCategory === 'All' || doc.category === activeCategory) &&
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNew = async () => {
    const newDoc: Doc = {
      id: crypto.randomUUID(),
      title: 'Untitled Document',
      category: activeCategory === 'All' ? 'Engineering' : activeCategory,
      lastUpdated: new Date().toISOString(),
      author: user?.name || 'Unknown',
      type: 'text',
      content: ''
    };
    
    try {
      await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDoc)
      });
      setDocuments([newDoc, ...documents]);
      setSelectedDoc(newDoc);
      setIsEditing(true);
    } catch (error) {
      console.error('Failed to create document', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();

        if (uploadData.success) {
          const isPdf = file.type === 'application/pdf';
          const newDoc: Doc = {
            id: crypto.randomUUID(),
            title: file.name,
            category: activeCategory === 'All' ? 'Engineering' : activeCategory,
            lastUpdated: new Date().toISOString(),
            author: user?.name || 'Unknown',
            type: isPdf ? 'pdf' : 'doc',
            fileUrl: uploadData.url
          };

          await fetch('/api/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newDoc)
          });

          setDocuments([newDoc, ...documents]);
        }
      } catch (error) {
        console.error('Failed to upload file', error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const saveDoc = async (updatedDoc: Doc) => {
    try {
      updatedDoc.lastUpdated = new Date().toISOString();
      await fetch(`/api/documents/${updatedDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDoc)
      });
      setDocuments(documents.map(d => d.id === updatedDoc.id ? updatedDoc : d));
      setSelectedDoc(updatedDoc);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save document', error);
    }
  };

  const deleteDoc = async (id: string) => {
    // We can't use window.confirm in iframe, so we'll just delete it directly for now
    // In a real app, we'd use a custom modal
    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      setDocuments(documents.filter(d => d.id !== id));
      setSelectedDoc(null);
    } catch (error) {
      console.error('Failed to delete document', error);
    }
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col relative overflow-hidden">
      <AnimatePresence mode="wait">
        {!selectedDoc ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full flex flex-col overflow-y-auto"
          >
            <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4 shrink-0">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center">
                  <BookOpen className="w-8 h-8 mr-3 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                  Knowledge Base
                </h1>
                <p className="text-zinc-400">Centralized documentation, PDFs, and team resources.</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="secondary" onClick={() => setIsUploading(true)}>
                  <UploadCloud className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
                <Button onClick={handleCreateNew} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  New Document
                </Button>
              </div>
            </header>

            {isUploading && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-8 p-8 border-2 border-dashed border-emerald-500/30 rounded-3xl bg-emerald-500/5 text-center relative"
              >
                <button onClick={() => setIsUploading(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
                <UploadCloud className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Upload PDF or DOC</h3>
                <p className="text-sm text-zinc-400 mb-4">Drag and drop your files here, or click to browse.</p>
                <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className="cursor-pointer inline-flex items-center justify-center px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors">
                  Browse Files
                </label>
              </motion.div>
            )}

            <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
              {/* Sidebar Categories */}
              <div className="w-full md:w-64 shrink-0 space-y-2 overflow-y-auto pr-2">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4 px-3">Categories</h3>
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`w-full flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      activeCategory === category 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Folder className="w-4 h-4 mr-3 opacity-70" />
                    {category}
                  </button>
                ))}
              </div>

              {/* Main Content */}
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="Search documentation..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-600"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-8">
                  {filteredDocs.map(doc => (
                    <motion.div
                      key={doc.id}
                      layoutId={`doc-${doc.id}`}
                      onClick={() => {
                        setSelectedDoc(doc);
                        setIsEditing(false);
                      }}
                      className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:bg-white/[0.04] transition-all cursor-pointer group flex flex-col h-48"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-2 rounded-lg ${doc.type === 'pdf' ? 'bg-red-500/10 text-red-400' : doc.type === 'doc' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {doc.type === 'pdf' ? <File className="w-5 h-5" /> : doc.type === 'doc' ? <FileText className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteDoc(doc.id); }}
                          className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors line-clamp-2">{doc.title}</h3>
                      <p className="text-sm text-zinc-400 mb-auto">{doc.category}</p>
                      
                      <div className="flex items-center justify-between text-xs text-zinc-500 pt-4 border-t border-white/10 mt-4">
                        <span>{doc.lastUpdated}</span>
                        <span className="flex items-center">
                          {doc.author}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                  {filteredDocs.length === 0 && (
                    <div className="col-span-full py-12 text-center text-zinc-500">
                      No documents found matching your search.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="viewer"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="h-full flex flex-col bg-zinc-900/50 rounded-3xl border border-white/10 overflow-hidden"
          >
            <header className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20 shrink-0">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedDoc(null)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${selectedDoc.type === 'pdf' ? 'bg-red-500/10 text-red-400' : selectedDoc.type === 'doc' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {selectedDoc.type === 'pdf' ? <File className="w-4 h-4" /> : selectedDoc.type === 'doc' ? <FileText className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                  </div>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={selectedDoc.title}
                      onChange={(e) => setSelectedDoc({...selectedDoc, title: e.target.value})}
                      className="bg-black/20 border border-white/10 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-emerald-500/50"
                    />
                  ) : (
                    <h2 className="text-lg font-bold text-white">{selectedDoc.title}</h2>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedDoc.type === 'text' && !isEditing && (
                  <Button variant="secondary" onClick={() => setIsEditing(true)}>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
                {isEditing && (
                  <Button onClick={() => saveDoc(selectedDoc)} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                    Save Changes
                  </Button>
                )}
                {(selectedDoc.type === 'pdf' || selectedDoc.type === 'doc') && (
                  <Button variant="secondary" onClick={() => {
                    if (selectedDoc.fileUrl) {
                      window.open(selectedDoc.fileUrl, '_blank');
                    }
                  }}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-black/10">
              {selectedDoc.type === 'text' ? (
                <div className="w-full max-w-3xl bg-white/[0.02] border border-white/5 rounded-2xl p-8 shadow-2xl">
                  {isEditing ? (
                    <textarea 
                      value={selectedDoc.content}
                      onChange={(e) => setSelectedDoc({...selectedDoc, content: e.target.value})}
                      className="w-full h-full min-h-[500px] bg-transparent border-none focus:ring-0 text-zinc-300 resize-none font-mono text-sm"
                      placeholder="Start typing your document here using Markdown..."
                    />
                  ) : (
                    <div className="prose prose-invert prose-emerald max-w-none">
                      {selectedDoc.content?.split('\n').map((line, i) => {
                        if (line.startsWith('# ')) return <h1 key={i} className="text-3xl font-bold text-white mb-4">{line.replace('# ', '')}</h1>;
                        if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold text-white mt-8 mb-4">{line.replace('## ', '')}</h2>;
                        if (line.startsWith('- ')) return <li key={i} className="text-zinc-300 ml-4">{line.replace('- ', '')}</li>;
                        if (line.trim() === '') return <br key={i} />;
                        return <p key={i} className="text-zinc-300 mb-4">{line}</p>;
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full max-w-4xl flex flex-col items-center justify-center text-center">
                  <div className="w-32 h-32 rounded-3xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 shadow-2xl">
                    {selectedDoc.type === 'pdf' ? <File className="w-16 h-16 text-red-400" /> : <FileText className="w-16 h-16 text-blue-400" />}
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedDoc.title}</h2>
                  <p className="text-zinc-400 mb-8">This file type cannot be previewed directly in the browser.</p>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-6 text-lg rounded-2xl"
                    onClick={() => {
                      if (selectedDoc.fileUrl) {
                        window.open(selectedDoc.fileUrl, '_blank');
                      }
                    }}
                  >
                    <Download className="w-6 h-6 mr-3" />
                    Download to View
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
