import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';

import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Loader2 } from 'lucide-react';

interface VerificationRequest {
  id: number;
  user_id: string;
  verification_type: 'student' | 'founder';
  status: string;
  document_path: string | null;
  college_name?: string;
  startup_name?: string;
  created_at: string;
}

export function AdminVerificationsPage() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string>('');

  const isAdmin = async () => {
    if (!user?.email) return false;
    const { data, error } = await supabase
      .from('admin_allowlist')
      .select('email')
      .eq('email', user.email)
      .single();
    return !!data && !error;
  };

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const admin = await isAdmin();
      if (!admin) {
        setError('Access denied. You are not an admin.');
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setRequests(data as VerificationRequest[]);
    } catch (e: any) {
      setError(e.message);
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
      // Update verification request status
      const { error: updErr } = await supabase
        .from('verification_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', requestId);
      if (updErr) throw updErr;

      // Get the request to know type and user_id
      const { data: reqData } = await supabase
        .from('verification_requests')
        .select('verification_type, user_id')
        .eq('id', requestId)
        .single();
      if (!reqData) throw new Error('Request not found after update');

      const column = reqData.verification_type === 'student' ? 'student_verified' : 'founder_verified';
      // Update profile column
      const { error: profErr } = await supabase
        .from('profiles')
        .update({ [column]: true })
        .eq('id', reqData.user_id);
      if (profErr) throw profErr;

      // Refresh list
      void fetchRequests();
    } catch (e: any) {
      setError(e.message);
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
      void fetchRequests();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin" /> Loading admin verification requests...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Verification Requests</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {requests.length === 0 ? (
        <p>No pending verification requests.</p>
      ) : (
        <table className="min-w-full table-auto border border-gray-200 dark:border-gray-700">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">User ID</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">College / Startup</th>
              <th className="px-4 py-2">Document</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="px-4 py-2">{req.id}</td>
                <td className="px-4 py-2">{req.user_id}</td>
                <td className="px-4 py-2 capitalize">{req.verification_type}</td>
                <td className="px-4 py-2">
                  {req.verification_type === 'student' ? req.college_name : req.startup_name}
                </td>
                <td className="px-4 py-2">
                  {req.document_path ? (
                    <a
                      href={supabase.storage.from('verification-documents').getPublicUrl(req.document_path).publicURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      View
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-2 space-x-2">
                  <Button
                    variant="primary"
                    disabled={actionLoading === req.id}
                    onClick={() => void handleApprove(req.id)}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    disabled={actionLoading === req.id}
                    onClick={() => void handleReject(req.id)}
                  >
                    Reject
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
