import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Send, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import type { Conversation, Message } from '../types';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { isUserOnline, formatLastSeen } from '../utils/presence';

const channelRefCounts: Record<string, number> = {};
const pendingChannelCleanups: Record<string, NodeJS.Timeout> = {};

function subscribeWithRefCount(channelName: string, createChannelFn: () => any): any {
  if (pendingChannelCleanups[channelName]) {
    clearTimeout(pendingChannelCleanups[channelName]);
    delete pendingChannelCleanups[channelName];
  }
  channelRefCounts[channelName] = (channelRefCounts[channelName] || 0) + 1;
  return createChannelFn();
}

function unsubscribeWithRefCount(channelName: string, channel: any) {
  channelRefCounts[channelName] = Math.max(0, (channelRefCounts[channelName] || 1) - 1);
  if (channelRefCounts[channelName] === 0) {
    pendingChannelCleanups[channelName] = setTimeout(() => {
      if (channelRefCounts[channelName] === 0) {
        supabase.removeChannel(channel);
        delete pendingChannelCleanups[channelName];
      }
    }, 1000);
  }
}

export function MessagesPage() {
  const { user } = useAuthStore();
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // WhatsApp-style realtime presence tracking states
  const [onlineUsers, setOnlineUsers] = useState<Record<string, any>>({});
  const [partnerActiveInChat, setPartnerActiveInChat] = useState(false);

  // Real-time Typing Indicator State & Refs
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentTypingRef = useRef<number>(0);
  const typingChannelRef = useRef<any>(null);

  // Sync selectedConversation to ref to avoid recreating the global messages subscription
  const selectedConversationRef = useRef<Conversation | null>(null);
  selectedConversationRef.current = selectedConversation;

  useEffect(() => {
    if (!user) return;
    if (!conversationId) {
      fetchConversations();
    }
  }, [user, conversationId]);

  useEffect(() => {
    if (conversationId) {
      openConversation(conversationId);
    } else {
      setSelectedConversation(null);
    }
  }, [conversationId, user]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const appendMessageToState = (newMsg: any) => {
    if (!newMsg) return;
    setMessages((currentMessages) => {
      if (currentMessages.some((msg) => msg.id === newMsg.id)) {
        return currentMessages;
      }
      return [...currentMessages, newMsg as Message];
    });
  };

  // A. Global Message Subscription (For Sidebar Updates)
  useEffect(() => {
    if (!user) return;

    const globalMessagesUnsubscribe = api.subscribeToChanges(
      `global-messages-user-${user.id}`,
      'messages',
      '*',
      async () => {
        // Always reload/update the conversations list silently to ensure accurate counts and status
        await fetchConversations(true);
      }
    );

    return () => {
      globalMessagesUnsubscribe();
    };
  }, [user]);

  // A.2 Conversation-Specific Message Subscription (Supabase Realtime)
  useEffect(() => {
    if (!user || !conversationId) return;

    const uniqueSuffix = Math.random().toString(36).substring(2, 11);
    const channelName = `messages:${conversationId}-${uniqueSuffix}`;
    console.log('channel name:', channelName);
    console.log('[Realtime Setup] conversationId:', conversationId);
    console.log('[Realtime Setup] currentUserId:', user.id);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('payload received', payload);
          console.log('[Realtime Payload Received - INSERT]:', payload);
          const newMsg = payload.new as Message;

          // Verify that this message belongs to the current conversation
          if (newMsg && newMsg.conversation_id === conversationId) {
            appendMessageToState(newMsg);

            // Silently mark as read and update badge if sent by another user
            if (newMsg.sender_id !== user.id) {
              api.markConversationMessagesRead(conversationId, user.id)
                .then(() => fetchConversations(true))
                .catch((err) => console.error('Error marking message read on realtime INSERT:', err));
            } else {
              fetchConversations(true);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('payload received', payload);
          console.log('[Realtime Payload Received - UPDATE]:', payload);
          const updatedMsg = payload.new as Message;
          if (updatedMsg && updatedMsg.conversation_id === conversationId) {
            setMessages((currentMessages) =>
              currentMessages.map((msg) =>
                msg.id === updatedMsg.id ? { ...msg, is_read: updatedMsg.is_read } : msg
              )
            );
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[Realtime Subscription Status]:', status);
        if (status === 'SUBSCRIBED') {
          console.log('SUBSCRIBED');
          console.log('[Realtime Subscribed] Successfully connected to channel:', channelName);
        } else if (status === 'CLOSED') {
          console.log('[Realtime Closed] Channel closed:', channelName);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('CHANNEL_ERROR', err);
          console.error('[Realtime Error] Channel error:', err);
        } else if (status === 'TIMED_OUT') {
          console.warn('[Realtime Timeout] Channel timed out:', channelName);
        }
      });

    return () => {
      console.log(`Tearing down realtime subscription for channel ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [user, conversationId]);

  // A.3 Global Presence Subscription (Track Online/Offline Status)
  useEffect(() => {
    if (!user) return;

    const channelName = 'presence:global';
    const globalPresenceChannel = subscribeWithRefCount(channelName, () => supabase.channel(channelName));

    globalPresenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = globalPresenceChannel.presenceState();
        const mappedUsers: Record<string, any> = {};
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.user_id) {
              mappedUsers[p.user_id] = p;
            }
          });
        });
        setOnlineUsers(mappedUsers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await globalPresenceChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString()
          });
        }
      });

    return () => {
      unsubscribeWithRefCount(channelName, globalPresenceChannel);
    };
  }, [user]);

  // A.4 Conversation-Specific Presence Subscription (Detect Partner Viewing Conversation)
  useEffect(() => {
    if (!user || !conversationId) {
      setPartnerActiveInChat(false);
      return;
    }

    const channelName = `presence:chat:${conversationId}`;
    const conversationPresenceChannel = subscribeWithRefCount(channelName, () => supabase.channel(channelName));

    conversationPresenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = conversationPresenceChannel.presenceState();
        const partnerId = selectedConversation?.partner?.id;
        if (partnerId) {
          const isPartnerHere = Object.values(state).some((presences: any) =>
            presences.some((p: any) => p.user_id === partnerId)
          );
          setPartnerActiveInChat(isPartnerHere);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await conversationPresenceChannel.track({
            user_id: user.id,
            viewing_chat: true
          });
        }
      });

    return () => {
      unsubscribeWithRefCount(channelName, conversationPresenceChannel);
    };
  }, [user, conversationId, selectedConversation?.partner?.id]);

  // Helper to render read receipts checks
  const renderReadReceipts = (message: Message) => {
    if (message.sender_id !== user.id) return null;

    const partnerId = selectedConversation?.partner?.id;
    const isPartnerOnline = partnerId ? !!onlineUsers[partnerId] : false;

    if (message.is_read) {
      return (
        <span className="inline-flex ml-1.5 align-middle text-sky-400" title="Read">
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M21 7L9 19l-5.5-5.5 1.41-1.41L9 16.17 19.59 5.59 21 7zm-5.13 0L14.7 5.82 9 11.53 7.42 9.95 6 11.37l3 3 6.87-7.37z" />
          </svg>
        </span>
      );
    } else if (isPartnerOnline) {
      return (
        <span className="inline-flex ml-1.5 align-middle text-zinc-400" title="Delivered">
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M21 7L9 19l-5.5-5.5 1.41-1.41L9 16.17 19.59 5.59 21 7zm-5.13 0L14.7 5.82 9 11.53 7.42 9.95 6 11.37l3 3 6.87-7.37z" />
          </svg>
        </span>
      );
    } else {
      return (
        <span className="inline-flex ml-1.5 align-middle text-zinc-400" title="Sent">
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
        </span>
      );
    }
  };

  // B. Real-time Typing Indicator Broadcast Channel Subscription
  useEffect(() => {
    if (!selectedConversation || !user) return;

    const channelName = `typing:${selectedConversation.id}`;
    const channel = subscribeWithRefCount(channelName, () => supabase.channel(channelName, {
      config: {
        broadcast: { self: false }
      }
    }));

    channel
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        if (payload?.payload?.typing) {
          setTypingUser(selectedConversation.partner?.full_name || selectedConversation.partner?.username || 'Founder');
          
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          
          typingTimeoutRef.current = setTimeout(() => {
            setTypingUser(null);
          }, 2000);
        }
      })
      .subscribe();

    typingChannelRef.current = channel;

    return () => {
      if (channel) {
        unsubscribeWithRefCount(channelName, channel);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setTypingUser(null);
    };
  }, [selectedConversation?.id, selectedConversation, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedConversation?.id]);

  const fetchConversations = async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    setError(null);

    try {
      const data = await api.getConversationsForUser(user.id);
      setConversations(data);
      if (!conversationId && data.length > 0 && window.innerWidth >= 1024) {
        navigate(`/messages/${data[0].id}`, { replace: true });
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Unable to load your conversations. Please refresh.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const openConversation = async (id: string) => {
    if (!user) return;

    setConversationLoading(true);
    setError(null);

    try {
      // 1. Mark all messages in this conversation as read first to guarantee database updates are completed
      await api.markConversationMessagesRead(id, user.id);

      // 2. Fetch the conversation details (which will now have the updated read status)
      const conversation = await api.getConversation(id, user.id);
      if (!conversation) {
        setSelectedConversation(null);
        setMessages([]);
        setError('Conversation not found or access denied.');
        return;
      }
      setSelectedConversation(conversation);
      setMessages(conversation.messages || []);

      // 3. Immediately refresh the local conversations list in the sidebar so the unread badge is cleared instantly
      const data = await api.getConversationsForUser(user.id);
      setConversations(data);
    } catch (err) {
      console.error('Error opening conversation:', err);
      setError((err as Error).message || 'Unable to open the conversation.');
      setSelectedConversation(null);
      setMessages([]);
    } finally {
      setConversationLoading(false);
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    navigate(`/messages/${conversation.id}`);
    await openConversation(conversation.id);
  };

  const handleTyping = () => {
    if (!user || !selectedConversation || !typingChannelRef.current) return;
    const now = Date.now();
    if (now - lastSentTypingRef.current > 1500) {
      lastSentTypingRef.current = now;
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: user.id, typing: true }
      });
    }
  };

  const handleSendMessage = async () => {
    if (!user || !selectedConversation) return;
    if (!messageText.trim()) return;

    setSendLoading(true);
    setError(null);

    try {
      const recipientId = selectedConversation.conversation_type === 'private' && selectedConversation.partner?.id !== 'unknown'
        ? selectedConversation.partner?.id
        : undefined;
      const sent = await api.sendMessage(selectedConversation.id, user.id, messageText, recipientId);
      setMessages((prev) => (prev.some((message) => message.id === sent.id) ? prev : [...prev, sent]));

      setMessageText('');
      await api.markConversationMessagesRead(selectedConversation.id, user.id);
      await fetchConversations(true);
    } catch (err) {
      console.error('Error sending message:', err);
      setError((err as Error).message || 'Unable to send your message.');
    } finally {
      setSendLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-zinc-500">Sign in to view and manage your messages.</p>
        <Link to="/login" className="mt-4 inline-flex items-center gap-2 text-orange-500 hover:underline">
          Sign in to continue
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none min-w-0 md:max-w-7xl md:mx-auto px-4 md:px-0 lg:px-8 py-0 lg:py-8">
      <div className="hidden lg:flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-orange-500 mb-2">Messages</p>
          <h1 className="text-3xl font-semibold text-zinc-950 dark:text-white">Your conversations</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
            Message other founders once you are connected. Keep conversations private and easy to manage.
          </p>
        </div>
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:text-orange-500">
          <ArrowLeft className="w-4 h-4" />
          Back to feed
        </Link>
      </div>

      <div className="grid gap-0 lg:gap-6 lg:grid-cols-[320px_1fr] h-[calc(100vh-7rem)] sm:h-[calc(100vh-8.5rem)] lg:h-[calc(100vh-12rem)]">
        <aside className={`${selectedConversation ? 'hidden' : 'flex'} lg:flex flex-col h-full rounded-none lg:rounded-[2rem] border-0 lg:border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-none lg:shadow-sm overflow-hidden`}>
          <div className="border-b border-zinc-200 dark:border-zinc-800 px-5 py-4 flex items-center gap-3 flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-orange-500" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                <p>No active conversations yet.</p>
                <p className="mt-2 text-sm">Start building your network by connecting with other founders.</p>
              </div>
            ) : (
              <div className="space-y-2 p-3">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => handleSelectConversation(conversation)}
                    className={`w-full text-left rounded-3xl p-4 transition ${
                      selectedConversation?.id === conversation.id
                        ? 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-700'
                        : 'border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        <Avatar src={conversation.partner?.avatar_url} alt={conversation.partner?.full_name || conversation.partner?.username} size="sm" />
                        <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border-2 border-white dark:border-zinc-950 ${((conversation.partner?.id && onlineUsers[conversation.partner.id]) || isUserOnline(conversation.partner?.last_seen)) ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{conversation.partner?.full_name || conversation.partner?.username}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{conversation.last_message || 'No messages yet'}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-zinc-400">
                      <span>{conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleDateString() : 'No activity'}</span>
                      {conversation.unread_count ? (
                        <span className="rounded-full bg-sky-500 px-2 py-1 text-white font-semibold">{conversation.unread_count}</span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <main className={`${selectedConversation ? 'flex' : 'hidden'} lg:flex flex-col h-full rounded-none lg:rounded-[2rem] border-0 lg:border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-none lg:shadow-sm overflow-hidden`}>
          <div className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between flex-shrink-0 bg-white dark:bg-zinc-950 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              {selectedConversation && (
                <button
                  onClick={() => {
                    setSelectedConversation(null);
                    navigate('/messages');
                  }}
                  className="inline-flex lg:hidden items-center justify-center p-1 -ml-1 text-zinc-700 dark:text-zinc-200 hover:text-orange-500 transition"
                  aria-label="Back to messages"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              )}
              {selectedConversation ? (
                <div className="flex items-center gap-2.5">
                  <div className="relative flex-shrink-0">
                    <Avatar
                      src={selectedConversation.partner?.avatar_url}
                      alt={selectedConversation.partner?.full_name || selectedConversation.partner?.username}
                      size="sm"
                      className="w-9 h-9"
                    />
                    <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border-2 border-white dark:border-zinc-950 ${((selectedConversation.partner?.id && onlineUsers[selectedConversation.partner.id]) || isUserOnline(selectedConversation.partner?.last_seen)) ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-white leading-tight">
                      {selectedConversation.partner?.full_name || selectedConversation.partner?.username}
                    </h2>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-none">
                      {partnerActiveInChat ? 'Online (active in chat)' : ((selectedConversation.partner?.id && onlineUsers[selectedConversation.partner.id]) || isUserOnline(selectedConversation.partner?.last_seen)) ? 'Active now' : formatLastSeen(selectedConversation.partner?.last_seen)}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">Conversation</p>
                  <h2 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-white">
                    Select a conversation
                  </h2>
                </div>
              )}
            </div>
            {selectedConversation?.unread_count ? (
              <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                {selectedConversation.unread_count} unread
              </span>
            ) : null}
          </div>

          {conversationLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              <p>{error}</p>
            </div>
          ) : !selectedConversation ? (
            <div className="p-8 text-center text-zinc-500 my-auto">
              <p>Select a conversation to view messages.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
                {messages.length === 0 ? (
                  <div className="rounded-3xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 p-8 text-center">
                    <p className="text-zinc-500">No messages yet — send the first one to start the conversation.</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isSender = message.sender_id === user.id;
                    return (
                      <div key={message.id} className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] lg:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm break-words whitespace-pre-wrap ${
                          isSender 
                            ? 'bg-orange-500 text-white rounded-br-none' 
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-none border border-zinc-200/40 dark:border-zinc-700/30'
                        }`}>
                          <p className="text-sm leading-relaxed">{message.content}</p>
                          <p className={`mt-1 text-[9px] uppercase tracking-[0.15em] font-medium text-right flex items-center justify-end gap-1.5 ${
                            isSender ? 'text-orange-200' : 'text-zinc-400 dark:text-zinc-500'
                          }`}>
                            <span>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {renderReadReceipts(message)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Typing Indicator */}
              {typingUser && (
                <div className="px-6 py-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 italic flex items-center gap-1.5 animate-pulse flex-shrink-0 bg-white/50 dark:bg-zinc-950/50">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500" />
                  </span>
                  {typingUser} is typing...
                </div>
              )}

              <div 
                className="border-t border-zinc-200 dark:border-zinc-800 px-3 sm:px-5 py-3 sm:py-4 flex-shrink-0 bg-white dark:bg-zinc-950"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
              >
                <div className="flex items-center gap-3">
                  <input
                    value={messageText}
                    onChange={(event) => {
                      setMessageText(event.target.value);
                      handleTyping();
                    }}
                    placeholder="Write a message..."
                    className="min-w-0 flex-1 rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-orange-500 dark:focus:ring-orange-500/20"
                  />
                  <Button size="sm" loading={sendLoading} onClick={handleSendMessage} className="h-11 px-5 rounded-3xl flex-shrink-0">
                    <Send className="w-4 h-4 mr-1.5" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
