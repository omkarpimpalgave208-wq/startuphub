import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, UserPlus, Clock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import type { ConnectionRequest } from '../types';
import { api } from '../lib/api';

export function ConnectionsPage() {
  const { user, profile } = useAuthStore();
  const [incoming, setIncoming] = useState<ConnectionRequest[]>([]);
  const [sent, setSent] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchRequests();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const unsubscribeIncoming = api.subscribeToChanges(
      `connection-requests-incoming-${user.id}`,
      'connection_requests',
      '*',
      () => fetchRequests(),
      `receiver_id=eq.${user.id}`
    );

    const unsubscribeSent = api.subscribeToChanges(
      `connection-requests-sent-${user.id}`,
      'connection_requests',
      '*',
      () => fetchRequests(),
      `sender_id=eq.${user.id}`
    );

    return () => {
      unsubscribeIncoming();
      unsubscribeSent();
    };
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;

    setLoading(true);
    setMessage(null);

    try {
      const [incomingRequests, sentRequests] = await Promise.all([
        api.getIncomingConnectionRequests(user.id),
        api.getSentConnectionRequests(user.id)
      ]);
      setIncoming(incomingRequests);
      setSent(sentRequests);
    } catch (err) {
      console.error('Error loading connection requests:', err);
      setMessage('Unable to load requests. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (requestId: string) => {
    if (!user) return;
    setActionLoading(true);
    setMessage(null);

    try {
      await api.acceptConnectionRequest(requestId, user.id);
      setIncoming((prev) => prev.filter((request) => request.id !== requestId));
      setMessage('Connection accepted. You are now connected.');
    } catch (err) {
      console.error('Accept request error:', err);
      setMessage((err as Error).message || 'Unable to accept request.');
    } finally {
      setActionLoading(false);
    }
  };

  const rejectRequest = async (requestId: string) => {
    if (!user) return;
    setActionLoading(true);
    setMessage(null);

    try {
      await api.rejectConnectionRequest(requestId, user.id);
      setIncoming((prev) => prev.filter((request) => request.id !== requestId));
      setMessage('Connection request rejected.');
    } catch (err) {
      console.error('Reject request error:', err);
      setMessage((err as Error).message || 'Unable to reject request.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-zinc-500">Sign in to view and manage your connection requests.</p>
        <Link to="/login" className="mt-4 inline-flex items-center gap-2 text-orange-500 hover:underline">
          Sign in to continue
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none min-w-0 md:max-w-6xl md:mx-auto px-4 md:px-0 py-8">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-orange-500 mb-2">Connections</p>
          <h1 className="text-3xl font-semibold text-zinc-950 dark:text-white">Connection requests</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
            Manage incoming requests and review the connection requests you've sent across StartupHub.
          </p>
        </div>
        <Link to={`/profile/${profile?.username ?? ''}`} className="hidden md:inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:text-orange-500">
          <ArrowLeft className="w-4 h-4" />
          Back to profile
        </Link>
      </div>

      {message && (
        <div className="rounded-3xl border border-orange-200 bg-orange-50 text-orange-800 px-4 py-3 mb-6">
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-none md:rounded-[2rem] border-0 md:border border-zinc-200 dark:border-zinc-800 bg-transparent md:bg-white md:dark:bg-zinc-950 p-0 md:p-6 shadow-none md:shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-zinc-450">Incoming</p>
              <p className="text-xl font-semibold text-zinc-900 dark:text-white">{incoming.length} pending request{incoming.length === 1 ? '' : 's'}</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
              <UserPlus className="w-4 h-4" />
              Waiting for your response
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 p-10 text-center">
              <p className="text-zinc-500">Loading requests…</p>
            </div>
          ) : incoming.length === 0 ? (
            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 p-10 text-center">
              <p className="text-zinc-500">You have no pending connection requests.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {incoming.map((request) => (
                <div key={request.id} className="flex flex-col gap-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-5">
                  <div className="flex items-center gap-4">
                    <Avatar src={request.sender?.avatar_url} alt={request.sender?.full_name || request.sender?.username} size="lg" />
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900 dark:text-white">{request.sender?.full_name || request.sender?.username}</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">@{request.sender?.username}</p>
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">wants to connect with you on StartupHub.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button size="sm" loading={actionLoading} onClick={() => acceptRequest(request.id)}>
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" loading={actionLoading} onClick={() => rejectRequest(request.id)}>
                      <XCircle className="w-4 h-4 mr-2" /> Ignore
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-none md:rounded-[2rem] border-0 md:border border-zinc-200 dark:border-zinc-800 bg-transparent md:bg-white md:dark:bg-zinc-950 p-0 md:p-6 shadow-none md:shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-zinc-400">Sent</p>
              <p className="text-xl font-semibold text-zinc-900 dark:text-white">{sent.length} request{sent.length === 1 ? '' : 's'}</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
              <Clock className="w-4 h-4" /> Waiting for response
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 p-10 text-center">
              <p className="text-zinc-500">Loading requests…</p>
            </div>
          ) : sent.length === 0 ? (
            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 p-10 text-center">
              <p className="text-zinc-500">No sent connection requests yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sent.map((request) => (
                <div key={request.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-5 w-full">
                  <div className="flex items-center gap-4 min-w-0">
                    <Avatar src={request.receiver?.avatar_url} alt={request.receiver?.full_name || request.receiver?.username} size="md" className="flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-zinc-900 dark:text-white truncate">{request.receiver?.full_name || request.receiver?.username}</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">@{request.receiver?.username}</p>
                      <p className="mt-1 text-sm text-zinc-650 dark:text-zinc-400 line-clamp-1">Pending request sent on {new Date(request.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="rounded-full bg-orange-100 dark:bg-orange-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-orange-700 dark:text-orange-300 w-fit sm:w-auto self-start sm:self-auto flex-shrink-0">
                    Pending
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
