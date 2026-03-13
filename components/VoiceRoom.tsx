'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, PhoneOff, Phone, Volume2, Monitor, AlertCircle, Video, VideoOff, Users } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import Image from 'next/image';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';

// Sub-component for volume visualization
function VolumeIndicator({ stream, isMuted }: { stream: MediaStream | null, isMuted?: boolean }) {
  const [volume, setVolume] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!stream || isMuted || stream.getAudioTracks().length === 0) {
      const reset = () => {
        if (isMounted) setVolume(0);
      };
      const id = requestAnimationFrame(reset);
      return () => {
        isMounted = false;
        cancelAnimationFrame(id);
      };
    }

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      
      const updateVolume = () => {
        if (!analyzerRef.current || !isMounted) return;
        analyzerRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setVolume(average);
        animationRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      console.error("Audio visualizer error:", err);
    }

    return () => {
      isMounted = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [stream, isMuted]);

  return (
    <div className="flex items-center space-x-[2px] h-2 w-6 mt-1">
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ 
            height: volume > (i * 15) ? '100%' : '20%',
            opacity: volume > (i * 15) ? 1 : 0.3
          }}
          className="w-1 bg-emerald-400 rounded-full"
        />
      ))}
    </div>
  );
}

function VideoPlayer({ stream, isLocal, isScreenShare }: { stream: MediaStream | null, isLocal: boolean, isScreenShare?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream || stream.getVideoTracks().length === 0) return null;

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden border border-white/10 flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full ${isScreenShare ? 'object-contain' : 'object-cover'}`}
      />
      {isScreenShare && (
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white flex items-center">
          <Monitor className="w-3 h-3 mr-1" /> Screen
        </div>
      )}
    </div>
  );
}

export function VoiceRoom({ channelId, isActive, onJoin }: { channelId: string, isActive?: boolean, onJoin?: () => void }) {
  const { user } = useAppContext();
  const [inVoice, setInVoice] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState<any[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isSharingCamera, setIsSharingCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (isActive) {
      const target = document.getElementById('voice-video-container');
      requestAnimationFrame(() => setPortalTarget(target));
    } else {
      requestAnimationFrame(() => setPortalTarget(null));
    }
  }, [isActive, inVoice]);
  
  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<{ [socketId: string]: RTCPeerConnection }>({});
  const audioRefs = useRef<{ [socketId: string]: HTMLAudioElement }>({});

  const leaveVoice = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    screenStreamRef.current = null;
    setInVoice(false);
    setIsSharingScreen(false);
    setIsSharingCamera(false);
    socketRef.current?.emit('leave_voice', channelId);
    
    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};
    
    Object.values(audioRefs.current).forEach(audio => {
      audio.srcObject = null;
      audio.remove();
    });
    audioRefs.current = {};
    
    setVoiceUsers([]);
  }, [channelId]);

  const joinVoice = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;
      setInVoice(true);
      const socket = socketRef.current;
      if (socket) {
        socket.emit('join_voice', channelId);
        if (user) {
          setVoiceUsers([{ socketId: socket.id, ...user, isMuted: false, streams: [stream] }]);
        }
      }
    } catch (err) {
      console.error("Failed to get audio", err);
      setError("Microphone access denied. Please check your browser settings.");
    }
  };

  const toggleCamera = async () => {
    if (isSharingCamera) {
      streamRef.current?.getVideoTracks().forEach(t => {
        t.stop();
        streamRef.current?.removeTrack(t);
      });
      setIsSharingCamera(false);
      
      Object.entries(peersRef.current).forEach(async ([targetSocketId, pc]) => {
        const senders = pc.getSenders();
        senders.forEach(sender => {
          if (sender.track?.kind === 'video' && !screenStreamRef.current?.getTracks().includes(sender.track)) {
            pc.removeTrack(sender);
          }
        });
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current?.emit('voice_signal', { to: targetSocketId, signal: pc.localDescription });
        } catch (err) {
          console.error("Error renegotiating after stopping camera", err);
        }
      });
      
      setVoiceUsers(prev => prev.map(u => {
        if (u.socketId === socketId) {
          return { ...u, streams: [streamRef.current, screenStreamRef.current].filter(Boolean) };
        }
        return u;
      }));
      return;
    }

    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoTrack = videoStream.getVideoTracks()[0];
      
      if (streamRef.current) {
        streamRef.current.addTrack(videoTrack);
      } else {
        streamRef.current = videoStream;
      }
      
      setIsSharingCamera(true);

      Object.entries(peersRef.current).forEach(async ([targetSocketId, pc]) => {
        pc.addTrack(videoTrack, streamRef.current!);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current?.emit('voice_signal', { to: targetSocketId, signal: pc.localDescription });
        } catch (err) {
          console.error("Error renegotiating camera", err);
        }
      });

      videoTrack.onended = () => {
        setIsSharingCamera(false);
        
        Object.entries(peersRef.current).forEach(async ([targetSocketId, pc]) => {
          const senders = pc.getSenders();
          senders.forEach(sender => {
            if (sender.track === videoTrack) {
              pc.removeTrack(sender);
            }
          });
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socketRef.current?.emit('voice_signal', { to: targetSocketId, signal: pc.localDescription });
          } catch (err) {
            console.error("Error renegotiating after camera ended", err);
          }
        });

        setVoiceUsers(prev => prev.map(u => {
          if (u.socketId === socketId) {
            return { ...u, streams: [streamRef.current, screenStreamRef.current].filter(Boolean) };
          }
          return u;
        }));
      };
      
      setVoiceUsers(prev => prev.map(u => {
        if (u.socketId === socketId) {
          return { ...u, streams: [streamRef.current, screenStreamRef.current].filter(Boolean) };
        }
        return u;
      }));
    } catch (err) {
      console.error("Failed to share camera", err);
      setError("Camera access denied.");
    }
  };

  const toggleScreenShare = async () => {
    if (isSharingScreen) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      
      Object.entries(peersRef.current).forEach(async ([targetSocketId, pc]) => {
        const senders = pc.getSenders();
        senders.forEach(sender => {
          if (sender.track && screenStreamRef.current?.getTracks().includes(sender.track)) {
            pc.removeTrack(sender);
          }
        });
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current?.emit('voice_signal', { to: targetSocketId, signal: pc.localDescription });
        } catch (err) {
          console.error("Error renegotiating after stopping screen share", err);
        }
      });
      
      screenStreamRef.current = null;
      setIsSharingScreen(false);
      
      setVoiceUsers(prev => prev.map(u => {
        if (u.socketId === socketId) {
          return { ...u, streams: [streamRef.current].filter(Boolean) };
        }
        return u;
      }));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true, 
        audio: true 
      });
      screenStreamRef.current = stream;
      setIsSharingScreen(true);

      stream.getTracks().forEach(track => {
        Object.entries(peersRef.current).forEach(async ([targetSocketId, pc]) => {
          pc.addTrack(track, stream);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socketRef.current?.emit('voice_signal', { to: targetSocketId, signal: pc.localDescription });
          } catch (err) {
            console.error("Error renegotiating screen share", err);
          }
        });
      });

      stream.getVideoTracks()[0].onended = () => {
        setIsSharingScreen(false);
        screenStreamRef.current = null;
        
        Object.entries(peersRef.current).forEach(async ([targetSocketId, pc]) => {
          const senders = pc.getSenders();
          senders.forEach(sender => {
            if (sender.track && stream.getTracks().includes(sender.track)) {
              pc.removeTrack(sender);
            }
          });
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socketRef.current?.emit('voice_signal', { to: targetSocketId, signal: pc.localDescription });
          } catch (err) {
            console.error("Error renegotiating after screen share ended", err);
          }
        });

        setVoiceUsers(prev => prev.map(u => {
          if (u.socketId === socketId) {
            return { ...u, streams: [streamRef.current].filter(Boolean) };
          }
          return u;
        }));
      };
      
      setVoiceUsers(prev => prev.map(u => {
        if (u.socketId === socketId) {
          return { ...u, streams: [streamRef.current, stream].filter(Boolean) };
        }
        return u;
      }));
    } catch (err) {
      console.error("Failed to share screen", err);
    }
  };

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        socketRef.current?.emit('voice_state_change', { isMuted: !audioTrack.enabled });
        
        const sid = socketRef.current?.id;
        if (sid) {
          setVoiceUsers(prev => prev.map(u => u.socketId === sid ? { ...u, isMuted: !audioTrack.enabled } : u));
        }
      }
    }
  };

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const createPeer = (targetSocketId: string, initiator: boolean) => {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ]
      });

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, streamRef.current!);
        });
      } else {
        pc.addTransceiver('audio', { direction: 'recvonly' });
        pc.addTransceiver('video', { direction: 'recvonly' });
      }

      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, screenStreamRef.current!);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('voice_signal', { to: targetSocketId, signal: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams[0];
        
        if (!audioRefs.current[targetSocketId]) {
          const audio = new Audio();
          audio.autoplay = true;
          audioRefs.current[targetSocketId] = audio;
        }
        
        if (event.track.kind === 'audio') {
          audioRefs.current[targetSocketId].srcObject = stream;
        }
        
        stream.onremovetrack = () => {
          if (stream.getTracks().length === 0) {
            setVoiceUsers(prev => prev.map(u => {
              if (u.socketId === targetSocketId) {
                return { ...u, streams: (u.streams || []).filter((s: MediaStream) => s.id !== stream.id) };
              }
              return u;
            }));
          }
        };
        
        setVoiceUsers(prev => prev.map(u => {
          if (u.socketId === targetSocketId) {
            const streams = u.streams || [];
            if (!streams.find((s: MediaStream) => s.id === stream.id)) {
              return { ...u, streams: [...streams, stream] };
            }
          }
          return u;
        }));
      };

      if (initiator) {
        pc.createOffer().then(offer => {
          pc.setLocalDescription(offer);
          socket.emit('voice_signal', { to: targetSocketId, signal: offer });
        });
      }

      return pc;
    };

    const handleUserJoined = ({ socketId: joinedSocketId, user: joinedUser }: any) => {
      if (!inVoice) return;
      const pc = createPeer(joinedSocketId, true);
      peersRef.current[joinedSocketId] = pc;
      setVoiceUsers(prev => {
        if (prev.some(u => u.socketId === joinedSocketId)) return prev;
        return [...prev, { socketId: joinedSocketId, ...joinedUser, isMuted: false, streams: [] }];
      });
    };

    const handleUserLeft = ({ socketId: leftSocketId }: any) => {
      if (peersRef.current[leftSocketId]) {
        peersRef.current[leftSocketId].close();
        delete peersRef.current[leftSocketId];
      }
      if (audioRefs.current[leftSocketId]) {
        audioRefs.current[leftSocketId].srcObject = null;
        audioRefs.current[leftSocketId].remove();
        delete audioRefs.current[leftSocketId];
      }
      setVoiceUsers(prev => prev.filter(u => u.socketId !== leftSocketId));
    };

    const handleVoiceSignal = async ({ from, signal, user: signalingUser }: any) => {
      if (!inVoice) return;
      let pc = peersRef.current[from];
      
      if (!pc) {
        pc = createPeer(from, false);
        peersRef.current[from] = pc;
        setVoiceUsers(prev => {
          if (prev.some(u => u.socketId === from)) return prev;
          return [...prev, { socketId: from, ...signalingUser, isMuted: false, streams: [] }];
        });
      }

      try {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('voice_signal', { to: from, signal: pc.localDescription });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal));
        }
      } catch (err) {
        console.error("WebRTC Error:", err);
      }
    };

    const handleVoiceStateChange = ({ socketId: changedSocketId, isMuted: remoteMuted }: any) => {
      setVoiceUsers(prev => prev.map(u => u.socketId === changedSocketId ? { ...u, isMuted: remoteMuted } : u));
    };

    socket.on('user_joined_voice', handleUserJoined);
    socket.on('user_left_voice', handleUserLeft);
    socket.on('voice_signal', handleVoiceSignal);
    socket.on('voice_state_change', handleVoiceStateChange);

    return () => {
      socket.off('user_joined_voice', handleUserJoined);
      socket.off('user_left_voice', handleUserLeft);
      socket.off('voice_signal', handleVoiceSignal);
      socket.off('voice_state_change', handleVoiceStateChange);
    };
  }, [inVoice]);

  useEffect(() => {
    if (!socketRef.current) {
      const newSocket = io();
      socketRef.current = newSocket;
      
      newSocket.on('connect', () => {
        setSocketId(newSocket.id || null);
        if (user) {
          newSocket.emit('authenticate', user);
        }
      });
    } else if (user && socketRef.current?.connected) {
      socketRef.current.emit('authenticate', user);
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (socketRef.current) {
        socketRef.current.emit('leave_voice', channelId);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      Object.values(peersRef.current).forEach(pc => pc.close());
    };
  }, [channelId]);

  // Flatten streams for rendering in the grid
  const gridItems = voiceUsers.flatMap(vu => {
    const streams = vu.streams || [];
    if (streams.length === 0) {
      return [{ user: vu, stream: null, isScreenShare: false, id: `${vu.socketId}-empty` }];
    }
    return streams.map((stream: MediaStream, index: number) => {
      // Determine if this stream is likely a screen share
      // A simple heuristic: if it has video but no audio, or if it's the second stream
      const hasVideo = stream.getVideoTracks().length > 0;
      const isScreenShare = hasVideo && (index > 0 || stream.getVideoTracks()[0].label.toLowerCase().includes('screen'));
      return { user: vu, stream, isScreenShare, id: `${vu.socketId}-${stream.id}` };
    });
  });

  return (
    <>
      <div className="bg-[#1E1F22] border border-white/5 rounded-xl p-3 mb-4 shadow-xl cursor-pointer hover:bg-[#2B2D31] transition-colors" onClick={onJoin}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            <h3 className="text-xs font-bold text-white flex items-center">
              <Volume2 className="w-3 h-3 mr-1.5 text-emerald-400" />
              Voice Channel
            </h3>
            {inVoice && (
              <span className="text-[9px] text-emerald-400 font-medium flex items-center mt-0.5">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1 animate-pulse" />
                Connected
              </span>
            )}
          </div>
          
          {!inVoice ? (
            <button
              onClick={(e) => { e.stopPropagation(); joinVoice(); }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded text-[10px] font-bold transition-all flex items-center shadow-lg shadow-emerald-500/20"
            >
              <Phone className="w-3 h-3 mr-1.5" />
              Join
            </button>
          ) : (
            <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
              <button
                onClick={toggleCamera}
                title="Share Camera"
                className={`p-1.5 rounded transition-colors ${isSharingCamera ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
              >
                {isSharingCamera ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
              </button>
               <button
                onClick={toggleScreenShare}
                title="Share Screen"
                className={`p-1.5 rounded transition-colors ${isSharingScreen ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
              >
                <Monitor className="w-3 h-3" />
              </button>
              <button
                onClick={toggleMute}
                className={`p-1.5 rounded transition-colors ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
              >
                {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
              </button>
              <button
                onClick={leaveVoice}
                className="bg-red-500 hover:bg-red-600 text-white px-2 py-1.5 rounded text-[10px] font-bold transition-all flex items-center shadow-lg shadow-red-500/20 ml-1"
              >
                <PhoneOff className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center p-2 mb-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-[9px]">
            <AlertCircle className="w-3 h-3 mr-1.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <AnimatePresence>
          {inVoice && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 overflow-hidden"
            >
              <div className="grid grid-cols-1 gap-2">
                {voiceUsers.map((vu) => {
                  const isLocal = vu.socketId === socketId;
                  const mainStream = vu.streams?.[0] || null;
                  
                  return (
                    <div key={vu.socketId} className="flex flex-col bg-white/5 rounded-lg p-2 border border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0">
                          <div className="relative w-6 h-6 rounded-full overflow-hidden mr-2 border border-white/10 flex-shrink-0">
                            <Image src={vu.avatar || 'https://i.pravatar.cc/150'} alt={vu.name || 'User'} fill className="object-cover" referrerPolicy="no-referrer" />
                            {vu.isMuted && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <MicOff className="w-2.5 h-2.5 text-red-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-bold text-white truncate">{vu.name || 'Unknown'}</span>
                            <VolumeIndicator 
                              stream={mainStream} 
                              isMuted={vu.isMuted}
                            />
                          </div>
                        </div>
                        {isLocal && (
                          <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter bg-white/5 px-1.5 py-0.5 rounded">You</span>
                        )}
                      </div>
                      
                      {/* Render video in sidebar only if portal is not active */}
                      {!portalTarget && vu.streams?.map((stream: MediaStream, idx: number) => {
                        const hasVideo = stream.getVideoTracks().length > 0;
                        if (!hasVideo) return null;
                        const isScreenShare = idx > 0 || stream.getVideoTracks()[0].label.toLowerCase().includes('screen');
                        return (
                          <div key={stream.id} className="mt-2 h-24">
                            <VideoPlayer stream={stream} isLocal={isLocal} isScreenShare={isScreenShare} />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              {voiceUsers.length === 1 && (
                <p className="text-[9px] text-zinc-500 italic text-center py-1">Waiting for others to join...</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Portal for large video grid */}
      {portalTarget && createPortal(
        <div className="w-full h-full flex flex-col p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Volume2 className="w-6 h-6 mr-2 text-emerald-400" />
              Voice Channel
            </h2>
            <div className="flex items-center space-x-2 bg-[#2B2D31] p-1.5 rounded-lg">
              <button
                onClick={toggleCamera}
                className={`p-3 rounded-lg transition-colors ${isSharingCamera ? 'bg-blue-500/20 text-blue-400' : 'bg-[#383A40] text-zinc-300 hover:bg-[#4E5058] hover:text-white'}`}
              >
                {isSharingCamera ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
              <button
                onClick={toggleScreenShare}
                className={`p-3 rounded-lg transition-colors ${isSharingScreen ? 'bg-blue-500/20 text-blue-400' : 'bg-[#383A40] text-zinc-300 hover:bg-[#4E5058] hover:text-white'}`}
              >
                <Monitor className="w-5 h-5" />
              </button>
              <button
                onClick={toggleMute}
                className={`p-3 rounded-lg transition-colors ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-[#383A40] text-zinc-300 hover:bg-[#4E5058] hover:text-white'}`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button
                onClick={leaveVoice}
                className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-lg transition-all shadow-lg shadow-red-500/20 ml-2"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
            {gridItems.map((item) => {
              const isLocal = item.user.socketId === socketId;
              const hasVideo = item.stream && item.stream.getVideoTracks().length > 0;

              return (
                <div key={item.id} className={`relative bg-[#2B2D31] rounded-2xl overflow-hidden border border-white/5 flex flex-col items-center justify-center group ${item.isScreenShare ? 'col-span-1 md:col-span-2 lg:col-span-2 row-span-2' : ''}`}>
                  {hasVideo ? (
                    <VideoPlayer stream={item.stream} isLocal={isLocal} isScreenShare={item.isScreenShare} />
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full min-h-[200px]">
                      <div className="relative w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-[#1E1F22]">
                        <Image src={item.user.avatar || 'https://i.pravatar.cc/150'} alt={item.user.name || 'User'} fill className="object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <VolumeIndicator stream={item.stream} isMuted={item.user.isMuted} />
                    </div>
                  )}
                  
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center">
                      <span className="text-sm font-bold text-white mr-2">{item.user.name || 'Unknown'}</span>
                      {isLocal && <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter bg-white/10 px-1.5 py-0.5 rounded">You</span>}
                    </div>
                    <div className="flex items-center space-x-2">
                      {item.user.isMuted && <MicOff className="w-4 h-4 text-red-400" />}
                    </div>
                  </div>
                </div>
              );
            })}
            {voiceUsers.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center text-zinc-500 h-full">
                <Users className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">No one is here yet</p>
                <p className="text-sm">Join the voice channel to start talking</p>
              </div>
            )}
          </div>
        </div>,
        portalTarget
      )}
    </>
  );
}
