import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Send, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import type { Conversation, Message } from '../types';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';

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

  useEffect(() => {
    if (!user) return;
    fetchConversations();
  }, [user]);

  useEffect(() => {
    if (conversationId) {
      openConversation(conversationId);
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

  useEffect(() => {
    if (!selectedConversation || !user) return;

    const unsubscribe = api.subscribeToChanges(
      `messages-conversation-${selectedConversation.id}-${user.id}`,
      'messages',
      'INSERT',
      async (payload) => {
        const newMessage = payload.new as Message;
        if (!newMessage || newMessage.conversation_id !== selectedConversation.id) return;

        setMessages((currentMessages) => {
          if (currentMessages.some((message) => message.id === newMessage.id)) {
            return currentMessages;
          }
          return [...currentMessages, newMessage];
        });

        if (newMessage.sender_id !== user.id) {
          await api.markConversationMessagesRead(selectedConversation.id, user.id);
          await fetchConversations();
        }
      },
      `conversation_id=eq.${selectedConversation.id}`
    );

    return () => unsubscribe();
  }, [selectedConversation?.id, selectedConversation, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedConversation?.id]);

  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const data = await api.getConversationsForUser(user.id);
      setConversations(data);
      if (!conversationId && data.length > 0) {
        navigate(`/messages/${data[0].id}`, { replace: true });
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Unable to load your conversations. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const openConversation = async (id: string) => {
    if (!user) return;

    setConversationLoading(true);
    setError(null);

    try {
      const conversation = await api.getConversation(id, user.id);
      if (!conversation) {
        setSelectedConversation(null);
        setMessages([]);
        setError('Conversation not found or access denied.');
        return;
      }
      setSelectedConversation(conversation);
      setMessages(conversation.messages || []);
      await api.markConversationMessagesRead(conversation.id, user.id);
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

  const handleSendMessage = async () => {
    if (!user || !selectedConversation) return;
    if (!messageText.trim()) return;

    setSendLoading(true);
    setError(null);

    try {
      const sent = await api.sendMessage(selectedConversation.id, user.id, messageText);
      setMessages((prev) => (prev.some((message) => message.id === sent.id) ? prev : [...prev, sent]));
      setMessageText('');
      await api.markConversationMessagesRead(selectedConversation.id, user.id);
      await fetchConversations();
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
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

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-[2rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
          <div className="border-b border-zinc-200 dark:border-zinc-800 px-5 py-4 flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-orange-500" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Conversations</h2>
          </div>
          <div className="min-h-[24rem] overflow-y-auto">
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
                      <Avatar src={conversation.partner?.avatar_url} alt={conversation.partner?.full_name || conversation.partner?.username} size="sm" />
                      <div className="min-w-0">
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

        <main className="rounded-[2rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-zinc-400">Conversation</p>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                {selectedConversation?.partner?.full_name || selectedConversation?.partner?.username || 'Select a conversation'}
              </h2>
              {selectedConversation && (
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Status: {isOnline ? 'Online' : 'Offline'}
                </p>
              )}
            </div>
            {selectedConversation?.unread_count ? (
              <span className="rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
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
            <div className="p-8 text-center text-zinc-500">
              <p>Select a conversation to view messages.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {messages.length === 0 ? (
                  <div className="rounded-3xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 p-8 text-center">
                    <p className="text-zinc-500">No messages yet — send the first one to start the conversation.</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isSender = message.sender_id === user.id;
                    return (
                      <div key={message.id} className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-3xl px-4 py-3 ${isSender ? 'bg-orange-500 text-white' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'}`}>
                          <p className="text-sm leading-6">{message.content}</p>
                          <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400 text-right">
                            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-zinc-200 dark:border-zinc-800 px-5 py-4">
                <div className="flex items-center gap-3">
                  <input
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    placeholder="Write a message..."
                    className="min-w-0 flex-1 rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-orange-500 dark:focus:ring-orange-500/20"
                  />
                  <Button size="sm" loading={sendLoading} onClick={handleSendMessage}>
                    <Send className="w-4 h-4 mr-2" />
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
