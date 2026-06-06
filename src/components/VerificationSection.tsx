import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { supabase } from '../lib/supabase';
import { Loader2, UploadCloud, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { toast } from '../store/toastStore';
import type { VerificationRequest } from '../types';

type VerificationType = 'student' | 'founder';

export function VerificationSection() {
  const { user } = useAuthStore();
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  
  const [type, setType] = useState<VerificationType>('student');
  const [collegeName, setCollegeName] = useState('');
  const [startupName, setStartupName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileMessage, setFileMessage] = useState('');

  // Fetch existing request on load
  useEffect(() => {
    if (!user) return;
    
    const fetchExistingRequest = async () => {
      setLoading(true);
      setError('');
      try {
        const { data, error: selectErr } = await supabase
          .from('verification_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (selectErr) {
          // If table doesn't exist, we don't crash, we just let the user know verification is currently unavailable or will be configured.
          if (selectErr.code === 'PGRST116' || selectErr.message?.includes('does not exist')) {
            if (import.meta.env.DEV) {
              console.warn('[VerificationSection] Table verification_requests may not exist yet:', selectErr.message);
            }
            // Do not show error to user on load, just keep request null
            return;
          }
          throw selectErr;
        }
        
        if (data && data.length > 0) {
          setRequest(data[0] as VerificationRequest);
        }
      } catch (e: any) {
        if (import.meta.env.DEV) {
          console.error('[VerificationSection] Error fetching verification request:', e);
        }
        // User-friendly error message, not raw Supabase error
        setError('Unable to load verification details. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    
    void fetchExistingRequest();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowed.includes(selected.type)) {
      setFileMessage('Unsupported file type. Please upload a JPG, JPEG, PNG, or PDF.');
      setFile(null);
      return;
    }
    
    if (selected.size > 10 * 1024 * 1024) {
      setFileMessage('File is too large. Maximum allowed size is 10 MB.');
      setFile(null);
      return;
    }
    
    setFileMessage('');
    setFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (type === 'student' && !collegeName.trim()) {
      toast.error('Please enter your college name.');
      return;
    }
    if (type === 'founder' && !startupName.trim()) {
      toast.error('Please enter your startup name.');
      return;
    }
    if (!file) {
      toast.error('Please select a document to upload.');
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);
    setError('');

    try {
      // 1. Upload file to Supabase storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      
      const { error: uploadErr } = await supabase.storage
        .from('verification-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            const pct = Math.round((progress.loaded / progress.total) * 100);
            setUploadProgress(pct);
          }
        });

      if (uploadErr) {
        if (import.meta.env.DEV) {
          console.error('[VerificationSection] Storage upload error:', uploadErr);
        }
        throw new Error('upload_failed');
      }

      // 2. Insert record into verification_requests table
      const payload = {
        user_id: user.id,
        verification_type: type,
        document_url: filePath,
        status: 'pending',
        college_name: type === 'student' ? collegeName.trim() : null,
        startup_name: type === 'founder' ? startupName.trim() : null,
      };

      const { data, error: insertErr } = await supabase
        .from('verification_requests')
        .insert([payload])
        .select();

      if (insertErr) {
        if (import.meta.env.DEV) {
          console.error('[VerificationSection] Database insert error:', insertErr);
        }
        throw new Error('db_insert_failed');
      }

      toast.success('Verification request submitted successfully!');
      
      // Clear form states & success messages are handled by showing the pending status screen
      setCollegeName('');
      setStartupName('');
      setFile(null);
      setFileMessage('');
      setUploadProgress(null);

      if (data && data.length > 0) {
        setRequest(data[0] as VerificationRequest);
      }
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('[VerificationSection] Submission failed:', err);
      }
      
      if (err.message === 'upload_failed') {
        setError('Failed to upload the document. Please verify the file is under 10MB and try again.');
        toast.error('Document upload failed.');
      } else if (err.message === 'db_insert_failed' || err.message?.includes('relation "verification_requests" does not exist')) {
        setError('The verification requests system is not configured. Please contact support or try again later.');
        toast.error('Submission failed. Table does not exist.');
      } else {
        setError('An unexpected error occurred. Please check your network and try again.');
        toast.error('Failed to submit verification request.');
      }
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Verification Type
        </label>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant={type === 'student' ? 'primary' : 'outline'}
            onClick={() => setType('student')}
            className="flex-1 justify-center py-2"
          >
            🎓 Student Verification
          </Button>
          <Button
            type="button"
            variant={type === 'founder' ? 'primary' : 'outline'}
            onClick={() => setType('founder')}
            className="flex-1 justify-center py-2"
          >
            🚀 Founder Verification
          </Button>
        </div>
      </div>

      {type === 'student' ? (
        <Input
          label="College Name"
          value={collegeName}
          onChange={(e) => setCollegeName(e.target.value)}
          placeholder="e.g. Stanford University"
          required
          disabled={submitting}
        />
      ) : (
        <Input
          label="Startup Name"
          value={startupName}
          onChange={(e) => setStartupName(e.target.value)}
          placeholder="e.g. Acme Corp"
          required
          disabled={submitting}
        />
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Upload Proof Document (ID, Certificate, etc.)
        </label>
        <div className="relative border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition flex flex-col items-center justify-center text-center">
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,application/pdf"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={submitting}
          />
          <UploadCloud className="w-10 h-10 text-zinc-400 mb-2" />
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
            {file ? file.name : 'Select verification file'}
          </div>
          <p className="text-xs text-zinc-500">
            Accepts JPG, PNG, PDF up to 10 MB
          </p>
        </div>
        {fileMessage && <p className="text-red-500 text-xs mt-1">{fileMessage}</p>}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800/30 dark:bg-red-950/20 p-3.5 text-sm text-red-700 dark:text-red-400">
          ✗ {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {submitting && uploadProgress !== null && (
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-orange-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
            <div className="text-[10px] text-zinc-500 mt-1 text-right font-medium">
              Uploading: {uploadProgress}%
            </div>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          className="w-full justify-center py-2.5 font-semibold text-sm"
          disabled={submitting || !!fileMessage}
          loading={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit Request'}
        </Button>
      </div>
    </form>
  );

  const renderStatus = () => {
    const isApproved = request?.status === 'approved';
    const isRejected = request?.status === 'rejected';
    const isPending = request?.status === 'pending';

    return (
      <div className="text-center py-6 px-4">
        {isApproved && (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">
              Verification Approved
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mb-4">
              Your profile is verified as a{' '}
              <span className="font-semibold capitalize">
                {request?.verification_type}
              </span>
              . The verification badge is now active on your public profile.
            </p>
          </div>
        )}

        {isRejected && (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">
              Verification Rejected
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mb-4">
              Your request was not approved. If you believe this is a mistake, you can contact our support team.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRequest(null)}
              className="mt-2 text-xs"
            >
              Submit New Request
            </Button>
          </div>
        )}

        {isPending && (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mb-3">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">
              Request Pending Review
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
              We have received your{' '}
              <span className="font-semibold capitalize">
                {request?.verification_type}
              </span>{' '}
              verification request. An admin will review your document shortly.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="mt-8 bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
        Verification Badges
      </h2>
      {loading ? (
        <div className="flex items-center justify-center py-10 text-sm text-zinc-500 dark:text-zinc-400">
          <Loader2 className="animate-spin mr-2 w-5 h-5 text-orange-500" />
          Loading verification details...
        </div>
      ) : request ? (
        renderStatus()
      ) : (
        renderForm()
      )}
    </section>
  );
}
