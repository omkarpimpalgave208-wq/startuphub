import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  Trophy,
  Rocket,
  Users,
  FileCheck,
  Flag,
  BarChart3,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Search,
  X,
  ChevronRight,
  Calendar,
  DollarSign,
  Globe,
  Check,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  Lock,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAdminStore } from '../store/adminStore';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { toast } from '../store/toastStore';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Hackathon {
  id: string;
  name: string;
  organizer: string;
  description: string;
  website_url: string;
  registration_url: string;
  start_date: string;
  end_date: string;
  deadline: string;
  prize_pool: string;
  team_size: string;
  category: string;
  banner_url: string;
  created_at?: string;
}

interface AnalyticsSnapshot {
  totalUsers: number;
  totalStartups: number;
  totalDiscussions: number;
  totalHackathons: number;
  totalComments: number;
  pendingVerifications: number;
}

type AdminTab =
  | 'overview'
  | 'hackathons'
  | 'startups'
  | 'founders'
  | 'verifications'
  | 'reports';

// ─── Tab Config ───────────────────────────────────────────────────────────────

const TABS: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'hackathons', label: 'Hackathons', icon: Trophy },
  { id: 'startups', label: 'Startups', icon: Rocket },
  { id: 'founders', label: 'Founders', icon: Users },
  { id: 'verifications', label: 'Verifications', icon: FileCheck },
  { id: 'reports', label: 'Reports', icon: Flag },
];

// ─── Hackathon Form Defaults ─────────────────────────────────────────────────

const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET ?? 'products';

const extractStoragePath = (url: string): string | null => {
  if (!url) return null;
  const searchStr = `/${STORAGE_BUCKET}/`;
  const index = url.indexOf(searchStr);
  if (index !== -1) {
    return decodeURIComponent(url.substring(index + searchStr.length));
  }
  
  const publicIndex = url.indexOf('/public/');
  if (publicIndex !== -1) {
    const rest = url.substring(publicIndex + '/public/'.length);
    const firstSlash = rest.indexOf('/');
    if (firstSlash !== -1) {
      return decodeURIComponent(rest.substring(firstSlash + 1));
    }
  }

  const hackathonsIndex = url.indexOf('hackathons/');
  if (hackathonsIndex !== -1) {
    return decodeURIComponent(url.substring(hackathonsIndex));
  }

  return null;
};

const BLANK_FORM: Omit<Hackathon, 'id' | 'created_at'> = {
  name: '',
  organizer: '',
  description: '',
  website_url: '',
  registration_url: '',
  start_date: '',
  end_date: '',
  deadline: '',
  prize_pool: '',
  team_size: '',
  category: 'AI/ML',
  banner_url: '',
};

// ─── Access Denied Screen ────────────────────────────────────────────────────

function AccessDenied() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center mb-5">
        <Lock className="w-8 h-8 text-red-500" />
      </div>
      <h1 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">
        Access Denied
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mb-6">
        You don't have permission to access the Admin Dashboard. This area is
        restricted to platform administrators only.
      </p>
      <Button variant="outline" onClick={() => navigate('/')}>
        Return to Home
      </Button>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 flex items-center gap-4">
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-black text-zinc-900 dark:text-white">
          {value}
        </p>
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
          {label}
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminDashboardPage() {
  const { isAdmin, adminChecked } = useAdminStore();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Analytics state
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Hackathons state
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [hackLoading, setHackLoading] = useState(false);
  const [showHackForm, setShowHackForm] = useState(false);
  const [editingHack, setEditingHack] = useState<Hackathon | null>(null);
  const [hackForm, setHackForm] = useState<Omit<Hackathon, 'id' | 'created_at'>>(BLANK_FORM);

  // Banner upload state
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [bannerError, setBannerError] = useState<string>('');
  const [hackSaving, setHackSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Startups state
  const [startups, setStartups] = useState<any[]>([]);
  const [startupsLoading, setStartupsLoading] = useState(false);
  const [startupsSearch, setStartupsSearch] = useState('');

  // Founders state
  const [founders, setFounders] = useState<any[]>([]);
  const [foundersLoading, setFoundersLoading] = useState(false);
  const [foundersSearch, setFoundersSearch] = useState('');

  // Verifications state
  const [verifications, setVerifications] = useState<any[]>([]);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // ── Data fetchers ────────────────────────────────────────────────────────

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const [
        { count: users },
        { count: products },
        { count: discussions },
        { count: hackCount },
        { count: comments },
        { count: pendingVerif },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('discussions').select('*', { count: 'exact', head: true }),
        supabase.from('hackathons').select('*', { count: 'exact', head: true }),
        supabase.from('comments').select('*', { count: 'exact', head: true }),
        supabase
          .from('verification_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ]);
      setAnalytics({
        totalUsers: users ?? 0,
        totalStartups: products ?? 0,
        totalDiscussions: discussions ?? 0,
        totalHackathons: hackCount ?? 0,
        totalComments: comments ?? 0,
        pendingVerifications: pendingVerif ?? 0,
      });
    } catch (err) {
      console.error('[AdminDashboard] Analytics fetch failed:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const fetchHackathons = useCallback(async () => {
    setHackLoading(true);
    try {
      const { data, error } = await supabase
        .from('hackathons')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setHackathons(data ?? []);
    } catch (err) {
      // Fallback to localStorage
      const local = localStorage.getItem('startuphub_hackathons');
      setHackathons(local ? JSON.parse(local) : []);
    } finally {
      setHackLoading(false);
    }
  }, []);

  const fetchStartups = useCallback(async () => {
    setStartupsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, tagline, category, upvote_count, created_at, user_id, profiles:user_id(username, full_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setStartups(data ?? []);
    } catch (err) {
      console.error('[AdminDashboard] Startups fetch failed:', err);
    } finally {
      setStartupsLoading(false);
    }
  }, []);

  const fetchFounders = useCallback(async () => {
    setFoundersLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, headline, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setFounders(data ?? []);
    } catch (err) {
      console.error('[AdminDashboard] Founders fetch failed:', err);
    } finally {
      setFoundersLoading(false);
    }
  }, []);

  const fetchVerifications = useCallback(async () => {
    setVerifyLoading(true);
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setVerifications(data ?? []);
    } catch (err) {
      console.error('[AdminDashboard] Verifications fetch failed:', err);
    } finally {
      setVerifyLoading(false);
    }
  }, []);

  // Load data when tab changes
  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'overview') fetchAnalytics();
    if (activeTab === 'hackathons') fetchHackathons();
    if (activeTab === 'startups') fetchStartups();
    if (activeTab === 'founders') fetchFounders();
    if (activeTab === 'verifications') fetchVerifications();
  }, [activeTab, isAdmin]);

  // ── Hackathon CRUD ───────────────────────────────────────────────────────

  const openCreateHack = () => {
    setEditingHack(null);
    setHackForm(BLANK_FORM);
    setBannerFile(null);
    setBannerPreview('');
    setBannerError('');
    setUploadProgress(null);
    setShowHackForm(true);
  };

  const openEditHack = (h: Hackathon) => {
    setEditingHack(h);
    setHackForm({
      name: h.name,
      organizer: h.organizer,
      description: h.description,
      website_url: h.website_url ?? '',
      registration_url: h.registration_url ?? '',
      start_date: h.start_date ? h.start_date.substring(0, 10) : '',
      end_date: h.end_date ? h.end_date.substring(0, 10) : '',
      deadline: h.deadline ? h.deadline.substring(0, 10) : '',
      prize_pool: h.prize_pool ?? '',
      team_size: h.team_size ?? '',
      category: h.category ?? 'AI/ML',
      banner_url: h.banner_url ?? '',
    });
    setBannerFile(null);
    setBannerPreview(h.banner_url ?? '');
    setBannerError('');
    setUploadProgress(null);
    setShowHackForm(true);
  };

  const handleSaveHack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hackForm.name || !hackForm.organizer || !hackForm.description) {
      toast.error('Name, Organizer, and Description are required.');
      return;
    }
    if (bannerError) {
      toast.error('Please resolve the banner image error first.');
      return;
    }

    setHackSaving(true);
    setUploadProgress(null);

    let finalBannerUrl = hackForm.banner_url;
    let oldBannerUrlToDelete: string | null = null;

    try {
      if (bannerFile) {
        setUploadProgress(0);
        const fileExt = bannerFile.name.split('.').pop()?.toLowerCase() || 'png';
        const randomId = Math.random().toString(36).substring(2, 7);
        const filePath = `hackathons/${Date.now()}-${randomId}-banner.${fileExt}`;

        const { error: uploadErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, bannerFile, {
            cacheControl: '3600',
            upsert: true,
            onUploadProgress: (progress) => {
              const pct = Math.round((progress.loaded / progress.total) * 100);
              setUploadProgress(pct);
            }
          });

        if (uploadErr) {
          throw new Error(`Banner upload failed: ${uploadErr.message}`);
        }

        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(filePath);

        if (!urlData?.publicUrl) {
          throw new Error('Failed to retrieve public URL for uploaded banner image.');
        }

        finalBannerUrl = urlData.publicUrl;
        
        if (editingHack?.banner_url) {
          oldBannerUrlToDelete = editingHack.banner_url;
        }
      } else if (!bannerPreview && editingHack?.banner_url) {
        // Banner was explicitly removed
        finalBannerUrl = '';
        oldBannerUrlToDelete = editingHack.banner_url;
      }

      const updatedForm = {
        ...hackForm,
        banner_url: finalBannerUrl
      };

      if (editingHack) {
        const { error } = await supabase
          .from('hackathons')
          .update(updatedForm)
          .eq('id', editingHack.id);
        if (error) throw error;
        toast.success('Hackathon updated!');
      } else {
        const newId = crypto.randomUUID();
        const { error } = await supabase
          .from('hackathons')
          .insert({ ...updatedForm, id: newId, created_by: user?.id });
        if (error) {
          // localStorage fallback
          const updated = [
            ...hackathons,
            { ...updatedForm, id: newId, created_by: user?.id } as Hackathon,
          ];
          localStorage.setItem('startuphub_hackathons', JSON.stringify(updated));
          setHackathons(updated);
          toast.success('Hackathon created (local fallback)');
          setShowHackForm(false);
          return;
        }
        toast.success('Hackathon created!');
      }

      // Delete the old banner image from storage after successful db update/insert
      if (oldBannerUrlToDelete) {
        const storagePath = extractStoragePath(oldBannerUrlToDelete);
        if (storagePath) {
          try {
            const { error: deleteStorageError } = await supabase.storage
              .from(STORAGE_BUCKET)
              .remove([storagePath]);
            if (deleteStorageError) {
              console.warn('[AdminDashboard] Failed to delete old banner:', deleteStorageError.message);
            }
          } catch (storageErr) {
            console.warn('[AdminDashboard] Storage delete exception:', storageErr);
          }
        }
      }

      setShowHackForm(false);
      fetchHackathons();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save hackathon.');
    } finally {
      setHackSaving(false);
      setUploadProgress(null);
    }
  };

  const handleDeleteHack = async (id: string) => {
    if (!window.confirm('Delete this hackathon? This cannot be undone.')) return;
    try {
      const { error } = await supabase.from('hackathons').delete().eq('id', id);
      if (error) throw error;
      toast.success('Hackathon deleted.');
      fetchHackathons();
    } catch {
      // Fallback: remove from localStorage
      const updated = hackathons.filter((h) => h.id !== id);
      localStorage.setItem('startuphub_hackathons', JSON.stringify(updated));
      setHackathons(updated);
      toast.success('Deleted (local fallback).');
    }
  };

  // ── Startup deletion ─────────────────────────────────────────────────────

  const handleDeleteStartup = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast.success(`"${name}" deleted.`);
      setStartups((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete startup.');
    }
  };

  // ── Verifications ────────────────────────────────────────────────────────

  const handleApprove = async (req: any) => {
    setActionLoading(req.id);
    try {
      await supabase
        .from('verification_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', req.id);

      const col =
        req.verification_type === 'student'
          ? 'student_verified'
          : 'founder_verified';
      await supabase
        .from('profiles')
        .update({ [col]: true })
        .eq('id', req.user_id);

      toast.success('Approved!');
      fetchVerifications();
    } catch {
      toast.error('Failed to approve.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (req: any) => {
    setActionLoading(req.id);
    try {
      await supabase
        .from('verification_requests')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', req.id);
      toast.success('Rejected.');
      fetchVerifications();
    } catch {
      toast.error('Failed to reject.');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Guard: not yet checked ───────────────────────────────────────────────

  if (!adminChecked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return <AccessDenied />;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const filteredStartups = startups.filter(
    (s) =>
      !startupsSearch ||
      s.name?.toLowerCase().includes(startupsSearch.toLowerCase()) ||
      s.tagline?.toLowerCase().includes(startupsSearch.toLowerCase())
  );

  const filteredFounders = founders.filter(
    (f) =>
      !foundersSearch ||
      f.username?.toLowerCase().includes(foundersSearch.toLowerCase()) ||
      f.full_name?.toLowerCase().includes(foundersSearch.toLowerCase())
  );

  return (
    <div className="w-full max-w-none min-w-0 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
            Platform management · Restricted access
          </p>
        </div>
      </div>

      <div className="flex gap-6 min-h-[600px]">
        {/* Sidebar tabs */}
        <aside className="hidden md:flex flex-col gap-1 w-44 flex-shrink-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left w-full ${
                  active
                    ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{tab.label}</span>
                {tab.id === 'verifications' &&
                  analytics &&
                  analytics.pendingVerifications > 0 && (
                    <span className="ml-auto text-[10px] font-bold bg-orange-500 text-white rounded-full min-w-[1.1rem] h-[1.1rem] flex items-center justify-center px-1">
                      {analytics.pendingVerifications}
                    </span>
                  )}
              </button>
            );
          })}
        </aside>

        {/* Mobile tabs (horizontal scroll) */}
        <div className="md:hidden flex gap-2 overflow-x-auto hide-scrollbar w-full mb-4 flex-shrink-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-orange-500 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main content area */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {/* ── OVERVIEW ── */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-orange-500" />
                      Platform Analytics
                    </h2>
                    <button
                      onClick={fetchAnalytics}
                      className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
                      title="Refresh"
                    >
                      <RefreshCw className={`w-4 h-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  {analyticsLoading || !analytics ? (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 animate-pulse"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      <StatCard
                        icon={Users}
                        label="Total Users"
                        value={analytics.totalUsers}
                        color="bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                      />
                      <StatCard
                        icon={Rocket}
                        label="Total Startups"
                        value={analytics.totalStartups}
                        color="bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400"
                      />
                      <StatCard
                        icon={MessageSquare}
                        label="Discussions"
                        value={analytics.totalDiscussions}
                        color="bg-purple-100 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400"
                      />
                      <StatCard
                        icon={Trophy}
                        label="Hackathons"
                        value={analytics.totalHackathons}
                        color="bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
                      />
                      <StatCard
                        icon={TrendingUp}
                        label="Comments"
                        value={analytics.totalComments}
                        color="bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                      />
                      <StatCard
                        icon={FileCheck}
                        label="Pending Verifications"
                        value={analytics.pendingVerifications}
                        color="bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                      />
                    </div>
                  )}

                  {/* Quick actions */}
                  <div>
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">
                      Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {TABS.filter((t) => t.id !== 'overview').map((tab) => {
                        const Icon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-orange-500/30 hover:shadow-sm transition-all text-sm font-medium text-zinc-700 dark:text-zinc-300"
                          >
                            <Icon className="w-4 h-4 text-orange-500 flex-shrink-0" />
                            <span className="truncate">{tab.label}</span>
                            <ChevronRight className="w-3 h-3 ml-auto text-zinc-400 flex-shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── HACKATHONS ── */}
              {activeTab === 'hackathons' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-orange-500" />
                      Manage Hackathons
                    </h2>
                    <Button
                      variant="primary"
                      onClick={openCreateHack}
                      className="flex items-center gap-1.5 text-xs font-bold"
                    >
                      <Plus className="w-4 h-4" />
                      Add Hackathon
                    </Button>
                  </div>

                  {/* Hackathon Form Modal */}
                  <AnimatePresence>
                    {showHackForm && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                            {editingHack ? 'Edit Hackathon' : 'Create New Hackathon'}
                          </h3>
                          <button
                            onClick={() => setShowHackForm(false)}
                            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <form onSubmit={handleSaveHack} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(
                              [
                                ['name', 'Hackathon Name *', 'text', true, ''],
                                ['organizer', 'Organizer *', 'text', true, ''],
                                ['prize_pool', 'Prize Pool', 'text', false, 'e.g. $50,000'],
                                ['team_size', 'Team Size', 'text', false, 'e.g. 1-4 members'],
                                ['start_date', 'Start Date', 'date', false, ''],
                                ['end_date', 'End Date', 'date', false, ''],
                                ['deadline', 'Registration Deadline', 'date', false, ''],
                                ['website_url', 'Website URL', 'url', false, 'https://'],
                                ['registration_url', 'Registration URL', 'url', false, 'https://'],
                              ] as [
                                keyof typeof hackForm,
                                string,
                                string,
                                boolean,
                                string,
                              ][]
                            ).map(([field, label, type, required, placeholder]) => (
                              <div key={field} className="space-y-1">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                                  {label}
                                </label>
                                <input
                                  type={type}
                                  required={required}
                                  placeholder={placeholder}
                                  value={hackForm[field] as string}
                                  onChange={(e) =>
                                    setHackForm((f) => ({
                                      ...f,
                                      [field]: e.target.value,
                                    }))
                                  }
                                  disabled={hackSaving}
                                  className="block w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm outline-none focus:border-orange-500 disabled:opacity-60"
                                />
                              </div>
                            ))}

                            <div className="space-y-1">
                              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                                Category
                              </label>
                              <select
                                value={hackForm.category}
                                onChange={(e) =>
                                  setHackForm((f) => ({
                                    ...f,
                                    category: e.target.value,
                                  }))
                                }
                                disabled={hackSaving}
                                className="block w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm outline-none focus:border-orange-500 disabled:opacity-60"
                              >
                                {['AI/ML', 'Web3', 'SaaS', 'Mobile', 'Open Source'].map(
                                  (c) => (
                                    <option key={c} value={c}>
                                      {c}
                                    </option>
                                  )
                                )}
                              </select>
                            </div>

                            {/* Banner Image Upload */}
                            <div className="space-y-1 md:col-span-2">
                              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                                Banner Image
                              </label>
                              <div className="flex flex-col gap-2">
                                {bannerPreview ? (
                                  <div className="relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 aspect-[21/9] flex items-center justify-center">
                                    <img
                                      src={bannerPreview}
                                      alt="Banner preview"
                                      className="w-full h-full object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setBannerFile(null);
                                        setBannerPreview('');
                                        setHackForm((f) => ({ ...f, banner_url: '' }));
                                      }}
                                      disabled={hackSaving}
                                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors disabled:opacity-50"
                                      title="Remove image"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 bg-white dark:bg-zinc-900 transition-colors group ${hackSaving ? 'border-zinc-200 dark:border-zinc-800 opacity-60 cursor-not-allowed' : 'border-zinc-200 dark:border-zinc-800 hover:border-orange-500 dark:hover:border-orange-500/50 cursor-pointer'}`}>
                                    <div className="flex flex-col items-center gap-1.5">
                                      <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                                        <Plus className="w-4 h-4" />
                                      </div>
                                      <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                        Upload Hackathon Banner
                                      </div>
                                      <div className="text-[10px] text-zinc-400">
                                        JPG, JPEG, PNG, or WEBP up to 5MB
                                      </div>
                                    </div>
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/jpg,image/png,image/webp"
                                      disabled={hackSaving}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                                          if (!allowedTypes.includes(file.type)) {
                                            setBannerError('Only JPG, JPEG, PNG, or WEBP images are allowed.');
                                            setBannerFile(null);
                                            setBannerPreview('');
                                            return;
                                          }
                                          if (file.size > 5 * 1024 * 1024) {
                                            setBannerError('File size exceeds 5MB limit.');
                                            setBannerFile(null);
                                            setBannerPreview('');
                                            return;
                                          }
                                          setBannerError('');
                                          setBannerFile(file);
                                          setBannerPreview(URL.createObjectURL(file));
                                        }
                                      }}
                                      className="hidden"
                                    />
                                  </label>
                                )}
                                {bannerError && (
                                  <p className="text-xs text-red-500 font-medium">
                                    {bannerError}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                              Description *
                            </label>
                            <textarea
                              required
                              rows={3}
                              value={hackForm.description}
                              onChange={(e) =>
                                setHackForm((f) => ({
                                  ...f,
                                  description: e.target.value,
                                }))
                              }
                              disabled={hackSaving}
                              className="block w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm outline-none focus:border-orange-500 disabled:opacity-60"
                            />
                          </div>

                          {hackSaving && uploadProgress !== null && (
                            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden mt-2">
                              <div
                                className="bg-orange-500 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                              />
                              <div className="text-[10px] text-zinc-500 mt-1 text-right font-medium">
                                Uploading Banner: {uploadProgress}%
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2 pt-1">
                            <Button type="submit" variant="primary" size="sm" loading={hackSaving} disabled={hackSaving}>
                              {editingHack ? 'Save Changes' : 'Create Hackathon'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowHackForm(false)}
                              disabled={hackSaving}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Hackathon List */}
                  {hackLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-orange-500" />
                    </div>
                  ) : hackathons.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                      <Trophy className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                      <p className="text-zinc-500 font-medium text-sm">
                        No hackathons yet. Create the first one!
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                              <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                Name
                              </th>
                              <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                Organizer
                              </th>
                              <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                Category
                              </th>
                              <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                Start Date
                              </th>
                              <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500 text-right">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                            {hackathons.map((h) => (
                              <tr
                                key={h.id}
                                className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/20 transition"
                              >
                                <td className="px-5 py-3 text-sm font-semibold text-zinc-900 dark:text-white max-w-[180px] truncate">
                                  {h.name}
                                </td>
                                <td className="px-5 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                                  {h.organizer}
                                </td>
                                <td className="px-5 py-3">
                                  <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                                    {h.category}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-sm text-zinc-500">
                                  {h.start_date
                                    ? new Date(h.start_date).toLocaleDateString()
                                    : '—'}
                                </td>
                                <td className="px-5 py-3 text-right space-x-1 whitespace-nowrap">
                                  <button
                                    onClick={() => openEditHack(h)}
                                    className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
                                    title="Edit"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => void handleDeleteHack(h.id)}
                                    className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── STARTUPS ── */}
              {activeTab === 'startups' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Rocket className="w-5 h-5 text-orange-500" />
                      Manage Startups
                    </h2>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Search startups..."
                        value={startupsSearch}
                        onChange={(e) => setStartupsSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white outline-none focus:border-orange-500 w-56"
                      />
                    </div>
                  </div>
                  {startupsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-orange-500" />
                    </div>
                  ) : filteredStartups.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                      <Rocket className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                      <p className="text-zinc-500 font-medium text-sm">
                        {startupsSearch ? 'No results found.' : 'No startups yet.'}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                              <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                Startup
                              </th>
                              <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                Founder
                              </th>
                              <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                Category
                              </th>
                              <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                Upvotes
                              </th>
                              <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500 text-right">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                            {filteredStartups.map((s) => (
                              <tr
                                key={s.id}
                                className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/20 transition"
                              >
                                <td className="px-5 py-3">
                                  <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate max-w-[180px]">
                                    {s.name}
                                  </p>
                                  <p className="text-xs text-zinc-500 truncate max-w-[180px]">
                                    {s.tagline}
                                  </p>
                                </td>
                                <td className="px-5 py-3">
                                  <Link
                                    to={`/profile/${s.profiles?.username}`}
                                    className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300 hover:text-orange-500 transition-colors"
                                  >
                                    <Avatar
                                      src={s.profiles?.avatar_url}
                                      alt={s.profiles?.full_name}
                                      size="xs"
                                    />
                                    <span className="truncate max-w-[100px]">
                                      @{s.profiles?.username}
                                    </span>
                                  </Link>
                                </td>
                                <td className="px-5 py-3">
                                  <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 capitalize">
                                    {s.category}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                  {s.upvote_count ?? 0}
                                </td>
                                <td className="px-5 py-3 text-right whitespace-nowrap space-x-1">
                                  <Link
                                    to={`/product/${s.id}`}
                                    className="inline-flex items-center p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
                                    title="View"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Link>
                                  <button
                                    onClick={() => void handleDeleteStartup(s.id, s.name)}
                                    className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── FOUNDERS ── */}
              {activeTab === 'founders' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-orange-500" />
                      Manage Founders
                    </h2>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Search founders..."
                        value={foundersSearch}
                        onChange={(e) => setFoundersSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white outline-none focus:border-orange-500 w-56"
                      />
                    </div>
                  </div>
                  {foundersLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-orange-500" />
                    </div>
                  ) : filteredFounders.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                      <Users className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                      <p className="text-zinc-500 font-medium text-sm">
                        {foundersSearch ? 'No results found.' : 'No founders yet.'}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                              <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                Founder
                              </th>
                              <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                Headline
                              </th>
                              <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                Joined
                              </th>
                              <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500 text-right">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                            {filteredFounders.map((f) => (
                              <tr
                                key={f.id}
                                className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/20 transition"
                              >
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-3">
                                    <Avatar
                                      src={f.avatar_url}
                                      alt={f.full_name}
                                      size="sm"
                                    />
                                    <div>
                                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                                        {f.full_name || f.username}
                                      </p>
                                      <p className="text-xs text-zinc-500">
                                        @{f.username}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-3 text-sm text-zinc-600 dark:text-zinc-300 max-w-[200px] truncate">
                                  {f.headline || '—'}
                                </td>
                                <td className="px-5 py-3 text-sm text-zinc-500">
                                  {f.created_at
                                    ? new Date(f.created_at).toLocaleDateString()
                                    : '—'}
                                </td>
                                <td className="px-5 py-3 text-right">
                                  <Link
                                    to={`/profile/${f.username}`}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors"
                                  >
                                    View <ExternalLink className="w-3 h-3" />
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── VERIFICATIONS ── */}
              {activeTab === 'verifications' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-orange-500" />
                      Review Verifications
                    </h2>
                    <button
                      onClick={fetchVerifications}
                      className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
                      title="Refresh"
                    >
                      <RefreshCw className={`w-4 h-4 ${verifyLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  {verifyLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-orange-500" />
                    </div>
                  ) : verifications.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                      <FileCheck className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                      <p className="text-zinc-500 font-medium text-sm">
                        No pending verification requests.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                              <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                ID
                              </th>
                              <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                Type
                              </th>
                              <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                Institution / Startup
                              </th>
                              <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                Document
                              </th>
                              <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                Date
                              </th>
                              <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500 text-right">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                            {verifications.map((req) => {
                              const docUrl = req.document_url
                                ? supabase.storage
                                    .from('verification-documents')
                                    .getPublicUrl(req.document_url).data.publicUrl
                                : null;
                              return (
                                <tr
                                  key={req.id}
                                  className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/20 transition"
                                >
                                  <td className="px-5 py-3 text-sm font-semibold text-zinc-900 dark:text-white">
                                    #{req.id}
                                  </td>
                                  <td className="px-5 py-3">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                                        req.verification_type === 'student'
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                          : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400'
                                      }`}
                                    >
                                      {req.verification_type}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                                    {req.verification_type === 'student'
                                      ? req.college_name
                                      : req.startup_name}
                                  </td>
                                  <td className="px-5 py-3">
                                    {docUrl ? (
                                      <a
                                        href={docUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-orange-500 hover:text-orange-600"
                                      >
                                        View <ExternalLink className="w-3 h-3" />
                                      </a>
                                    ) : (
                                      <span className="text-zinc-400 text-sm">—</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3 text-sm text-zinc-500">
                                    {new Date(req.created_at).toLocaleDateString()}
                                  </td>
                                  <td className="px-5 py-3 text-right space-x-1 whitespace-nowrap">
                                    <Button
                                      variant="primary"
                                      disabled={actionLoading === req.id}
                                      onClick={() => void handleApprove(req)}
                                      className="px-3 py-1.5 text-xs gap-1"
                                    >
                                      <Check className="w-3.5 h-3.5" /> Approve
                                    </Button>
                                    <Button
                                      variant="outline"
                                      disabled={actionLoading === req.id}
                                      onClick={() => void handleReject(req)}
                                      className="px-3 py-1.5 text-xs gap-1 text-red-500 border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-950/20"
                                    >
                                      <X className="w-3.5 h-3.5" /> Reject
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
              )}

              {/* ── REPORTS ── */}
              {activeTab === 'reports' && (
                <div className="space-y-5">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Flag className="w-5 h-5 text-orange-500" />
                    Review Reports
                  </h2>
                  <div className="text-center py-20 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900/30">
                    <AlertTriangle className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-600 dark:text-zinc-400 font-semibold text-sm mb-1">
                      No reports to review
                    </p>
                    <p className="text-zinc-500 dark:text-zinc-500 text-xs max-w-xs mx-auto">
                      User-submitted reports will appear here when the reporting
                      feature is enabled on the platform.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
