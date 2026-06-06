import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Loader2, ShieldCheck, Check, X as CloseIcon, ExternalLink } from 'lucide-react';
import { toast } from '../store/toastStore';
import type { VerificationRequest } from '../types';

export function AdminVerificationsPage() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string>('');

  const isAdmin = async () => {
    if (!user?.email) return false;
    const { data, error: queryErr } = await supabase
      .from('admin_allowlist')
      .select('email')
      .eq('email', user.email)
      .single();
    if (queryErr) {
      if (import.meta.env.DEV) {
        console.error('[AdminVerificationsPage] Admin check failed:', queryErr);
      }
      return false;
    }
    return !!data;
  };

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const admin = await isAdmin();
      if (!admin) {
        setError('Access denied. You are not authorized to view this page.');
        setLoading(false);
        return;
      }
      
      const { data, error: selectErr } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
        
      if (selectErr) throw selectErr;
      setRequests(data as VerificationRequest[]);
    } catch (e: any) {
      if (import.meta.env.DEV) {
        console.error('[AdminVerificationsPage] Fetching requests failed:', e);
      }
      setError('Failed to fetch pending verification requests.');
      toast.error('Failed to load verification requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRequests();
  }, []);

  const handleApprove = async (requestId: number) => {
    setActionLoading(requestId);
    try {
      // 1. Update verification request status
      const { error: updErr } = await supabase
        .from('verification_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', requestId);
      if (updErr) throw updErr;

      // 2. Get the request details to update profile
      const { data: reqData, error: findErr } = await supabase
        .from('verification_requests')
        .select('verification_type, user_id')
        .eq('id', requestId)
        .single();
      if (findErr || !reqData) throw findErr || new Error('Request not found');

      const column = reqData.verification_type === 'student' ? 'student_verified' : 'founder_verified';
      
      // 3. Update profile verification column
      const { error: profErr } = await supabase
        .from('profiles')
        .update({ [column]: true })
        .eq('id', reqData.user_id);
      if (profErr) throw profErr;

      toast.success('Request approved successfully!');
      
      // Refresh list
      void fetchRequests();
    } catch (e: any) {
      if (import.meta.env.DEV) {
        console.error('[AdminVerificationsPage] Approve error:', e);
      }
      toast.error('Failed to approve request.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: number) => {
    setActionLoading(requestId);
    try {
      const { error: updErr } = await supabase
        .from('verification_requests')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', requestId);
      if (updErr) throw updErr;

      toast.success('Request rejected.');
      void fetchRequests();
    } catch (e: any) {
      if (import.meta.env.DEV) {
        console.error('[AdminVerificationsPage] Reject error:', e);
      }
      toast.error('Failed to reject request.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500 dark:text-zinc-400">
        <Loader2 className="animate-spin mb-3 w-8 h-8 text-orange-500" />
        Loading verification requests...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            Verification Portal
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            Pending student and founder status approvals
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-400 mb-6">
          ✗ {error}
        </div>
      )}

      {!error && requests.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/30">
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">
            No pending verification requests at this time.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">ID</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Type</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Institution / Startup</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Document</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Submitted At</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {requests.map((req) => {
                  const documentUrl = req.document_url
                    ? supabase.storage.from('verification-documents').getPublicUrl(req.document_url).data.publicUrl
                    : null;

                  return (
                    <tr key={req.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition">
                      <td className="px-6 py-4 text-sm font-semibold text-zinc-900 dark:text-white">
                        #{req.id}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                          req.verification_type === 'student'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400'
                        }`}>
                          {req.verification_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-300 font-medium">
                        {req.verification_type === 'student' ? req.college_name : req.startup_name}
                      </td>
                      <td className="px-6 py-4">
                        {documentUrl ? (
                          <a
                            href={documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm font-semibold text-orange-500 hover:text-orange-600 gap-1"
                          >
                            View Proof <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-zinc-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-500">
                        {new Date(req.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <Button
                          variant="primary"
                          disabled={actionLoading === req.id}
                          onClick={() => void handleApprove(req.id)}
                          className="px-3.5 py-1.5 text-xs font-bold gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button
                          variant="outline"
                          disabled={actionLoading === req.id}
                          onClick={() => void handleReject(req.id)}
                          className="px-3.5 py-1.5 text-xs font-bold gap-1 text-red-500 border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          <CloseIcon className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
