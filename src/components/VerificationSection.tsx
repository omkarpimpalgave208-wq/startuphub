import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

type VerificationType = 'student' | 'founder';

interface VerificationRequest {
  id: string;
  user_id: string;
  type: VerificationType;
  status: string;
  document_path: string | null;
  college_name?: string;
  startup_name?: string;
  created_at: string;
}

export function VerificationSection() {
  const { user, profile, fetchProfile } = useAuthStore();
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [type, setType] = useState<VerificationType>('student');
  const [collegeName, setCollegeName] = useState('');
  const [startupName, setStartupName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileMessage, setFileMessage] = useState('');

  // Fetch existing request on load
  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('verification_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        if (error) throw error;
        if (data && data.length) setRequest(data[0] as VerificationRequest);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    void fetch();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowed.includes(selected.type)) {
      setFileMessage('Unsupported file type. Allowed: JPG, JPEG, PNG, PDF.');
      setFile(null);
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setFileMessage('File exceeds 10 MB limit.');
      setFile(null);
      return;
    }
    setFileMessage('');
    setFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!file) {
      setError('Please select a document to upload.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const filePath = `verification-documents/${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from('verification-documents').upload(filePath, file);
      if (uploadErr) throw uploadErr;

      const payload: any = {
        user_id: user.id,
        type,
        document_path: filePath,
        status: 'pending',
      };
      if (type === 'student') payload.college_name = collegeName;
      else payload.startup_name = startupName;

      const { data, error: insertErr } = await supabase.from('verification_requests').insert([payload]);
      if (insertErr) throw insertErr;
      setSuccess('Verification request submitted successfully.');
      setRequest(data[0] as VerificationRequest);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center space-x-4">
        <Button type="button" variant={type === 'student' ? 'primary' : 'outline'} onClick={() => setType('student')}>
          Student Verification
        </Button>
        <Button type="button" variant={type === 'founder' ? 'primary' : 'outline'} onClick={() => setType('founder')}>
          Founder Verification
        </Button>
      </div>
      {type === 'student' && (
        <Input label="College Name" value={collegeName} onChange={e => setCollegeName(e.target.value)} required />
      )}
      {type === 'founder' && (
        <Input label="Startup Name" value={startupName} onChange={e => setStartupName(e.target.value)} required />
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Verification Document</label>
        <input type="file" accept="image/jpeg,image/jpg,image/png,application/pdf" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-500 file:text-white hover:file:bg-orange-600" />
        {fileMessage && <p className="text-red-600 mt-1 text-sm">{fileMessage}</p>}
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}
      <Button type="submit" variant="primary" loading={submitting}>Submit Request</Button>
    </form>
  );

  const renderStatus = () => (
    <div className="space-y-2">
      <p className="font-medium">Verification Status: <span className={request?.status === 'approved' ? 'text-green-600' : request?.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}>{request?.status ?? 'None'}</span></p>
      {request?.status === 'approved' && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Your profile has been {request.type === 'student' ? 'Student' : 'Founder'} Verified.</p>
      )}
    </div>
  );

  return (
    <section className="mt-8 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">Verification</h2>
      {loading ? (
        <div className="flex items-center"><Loader2 className="animate-spin mr-2" /> Loading...</div>
      ) : request ? (
        renderStatus()
      ) : (
        renderForm()
      )}
    </section>
  );
}
