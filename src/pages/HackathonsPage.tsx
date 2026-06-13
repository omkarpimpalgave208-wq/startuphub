import { useState, useEffect } from 'react';
import { 
  Trophy, 
  Search, 
  Users, 
  Code, 
  Award, 
  Sparkles, 
  Calendar,
  Layers,
  Inbox,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Globe,
  Settings,
  X,
  Lock,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { toast } from '../store/toastStore';

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
  created_by?: string;
  created_at?: string;
}

export function HackathonsPage() {
  const { user } = useAuthStore();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Live' | 'Upcoming' | 'AI/ML' | 'Web3' | 'SaaS' | 'Mobile' | 'Open Source'>('All');
  const [leaderboardTab, setLeaderboardTab] = useState<'points' | 'wins' | 'joined'>('points');

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formOrganizer, setFormOrganizer] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formWebsiteUrl, setFormWebsiteUrl] = useState('');
  const [formRegistrationUrl, setFormRegistrationUrl] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formPrizePool, setFormPrizePool] = useState('');
  const [formTeamSize, setFormTeamSize] = useState('');
  const [formCategory, setFormCategory] = useState('AI/ML');
  const [formBannerUrl, setFormBannerUrl] = useState('');

  // ----------------- DATA FETCH & LOCAL SYNC -----------------

  const fetchHackathons = async () => {
    setLoading(true);
    try {
      const { data, error: selectErr } = await supabase
        .from('hackathons')
        .select('*')
        .order('start_date', { ascending: true });

      if (selectErr) {
        console.warn('[Hackathons] Supabase query failed, using localStorage fallback:', selectErr.message);
        loadLocalHackathons();
      } else {
        setHackathons(data || []);
      }
    } catch (err: any) {
      console.warn('[Hackathons] Supabase fetch exception, using localStorage fallback:', err);
      loadLocalHackathons();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalHackathons = () => {
    const local = localStorage.getItem('startuphub_hackathons');
    if (local) {
      setHackathons(JSON.parse(local));
    } else {
      setHackathons([]);
    }
  };

  const saveLocalHackathons = (updatedList: Hackathon[]) => {
    localStorage.setItem('startuphub_hackathons', JSON.stringify(updatedList));
    setHackathons(updatedList);
  };

  const checkAdminStatus = async () => {
    if (!user?.email) {
      setIsAdminUser(false);
      return;
    }
    try {
      const { data, error: queryErr } = await supabase
        .from('admin_allowlist')
        .select('email')
        .eq('email', user.email)
        .single();
      
      if (queryErr) {
        setIsAdminUser(false);
      } else {
        setIsAdminUser(!!data);
      }
    } catch (err) {
      setIsAdminUser(false);
    }
  };

  useEffect(() => {
    void fetchHackathons();
  }, []);

  useEffect(() => {
    void checkAdminStatus();
  }, [user]);

  // ----------------- CRUD HANDLERS -----------------

  const resetForm = () => {
    setEditingId(null);
    setIsEditing(false);
    setFormName('');
    setFormOrganizer('');
    setFormDescription('');
    setFormWebsiteUrl('');
    setFormRegistrationUrl('');
    setFormStartDate('');
    setFormEndDate('');
    setFormDeadline('');
    setFormPrizePool('');
    setFormTeamSize('');
    setFormCategory('AI/ML');
    setFormBannerUrl('');
  };

  const handleSaveHackathon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formOrganizer || !formDescription) {
      toast.error('Name, Organizer, and Description are required!');
      return;
    }

    const payload: Omit<Hackathon, 'id'> & { id?: string } = {
      name: formName,
      organizer: formOrganizer,
      description: formDescription,
      website_url: formWebsiteUrl,
      registration_url: formRegistrationUrl,
      start_date: formStartDate,
      end_date: formEndDate,
      deadline: formDeadline,
      prize_pool: formPrizePool,
      team_size: formTeamSize,
      category: formCategory,
      banner_url: formBannerUrl,
    };

    try {
      if (editingId) {
        // Edit flow
        payload.id = editingId;
        const { error: editErr } = await supabase
          .from('hackathons')
          .update(payload)
          .eq('id', editingId);

        if (editErr) {
          console.warn('[Hackathons] Supabase update error, applying fallback:', editErr.message);
          const updated = hackathons.map(h => h.id === editingId ? { ...h, ...payload } as Hackathon : h);
          saveLocalHackathons(updated);
          toast.success('Hackathon updated (Local Fallback)');
        } else {
          toast.success('Hackathon updated successfully!');
          void fetchHackathons();
        }
      } else {
        // Create flow
        const newId = crypto.randomUUID();
        const newRecord = { ...payload, id: newId, created_by: user?.id } as Hackathon;

        const { error: insertErr } = await supabase
          .from('hackathons')
          .insert(newRecord);

        if (insertErr) {
          console.warn('[Hackathons] Supabase insert error, applying fallback:', insertErr.message);
          const updated = [...hackathons, newRecord];
          saveLocalHackathons(updated);
          toast.success('Hackathon created (Local Fallback)');
        } else {
          toast.success('Hackathon created successfully!');
          void fetchHackathons();
        }
      }
    } catch (err) {
      console.error('[Hackathons] CRUD operation failed:', err);
      // Local storage fallback
      if (editingId) {
        const updated = hackathons.map(h => h.id === editingId ? { ...h, ...payload } as Hackathon : h);
        saveLocalHackathons(updated);
        toast.success('Saved local changes');
      } else {
        const newRecord = { ...payload, id: crypto.randomUUID(), created_by: user?.id } as Hackathon;
        const updated = [...hackathons, newRecord];
        saveLocalHackathons(updated);
        toast.success('Created local record');
      }
    } finally {
      resetForm();
    }
  };

  const handleEditInit = (hack: Hackathon) => {
    setEditingId(hack.id);
    setIsEditing(true);
    setFormName(hack.name);
    setFormOrganizer(hack.organizer);
    setFormDescription(hack.description);
    setFormWebsiteUrl(hack.website_url || '');
    setFormRegistrationUrl(hack.registration_url || '');
    setFormStartDate(hack.start_date ? hack.start_date.substring(0, 10) : '');
    setFormEndDate(hack.end_date ? hack.end_date.substring(0, 10) : '');
    setFormDeadline(hack.deadline ? hack.deadline.substring(0, 10) : '');
    setFormPrizePool(hack.prize_pool || '');
    setFormTeamSize(hack.team_size || '');
    setFormCategory(hack.category || 'AI/ML');
    setFormBannerUrl(hack.banner_url || '');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this hackathon?')) return;

    try {
      const { error: deleteErr } = await supabase
        .from('hackathons')
        .delete()
        .eq('id', id);

      if (deleteErr) {
        console.warn('[Hackathons] Supabase delete failed, applying fallback:', deleteErr.message);
        const updated = hackathons.filter(h => h.id !== id);
        saveLocalHackathons(updated);
        toast.success('Hackathon deleted (Local)');
      } else {
        toast.success('Hackathon deleted from database!');
        void fetchHackathons();
      }
    } catch (err) {
      console.error('[Hackathons] Delete failed:', err);
      const updated = hackathons.filter(h => h.id !== id);
      saveLocalHackathons(updated);
      toast.success('Deleted local record');
    }
  };

  // ----------------- FILTER LOGIC -----------------

  const isLive = (hack: Hackathon) => {
    if (!hack.start_date || !hack.end_date) return false;
    const now = new Date().getTime();
    const start = new Date(hack.start_date).getTime();
    const end = new Date(hack.end_date).getTime();
    return now >= start && now <= end;
  };

  const isUpcoming = (hack: Hackathon) => {
    if (!hack.start_date) return false;
    const now = new Date().getTime();
    const start = new Date(hack.start_date).getTime();
    return now < start;
  };

  const filteredHackathons = hackathons.filter((hack) => {
    const matchesSearch = 
      hack.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hack.organizer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hack.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'All') return true;
    if (activeFilter === 'Live') return isLive(hack);
    if (activeFilter === 'Upcoming') return isUpcoming(hack);
    
    return hack.category === activeFilter;
  });

  return (
    <div className="w-full max-w-none min-w-0 px-4 md:px-0 space-y-12 pb-16">
      
      {/* HERO SECTION */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-orange-500" />
            Discover Hackathons
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2 max-w-2xl">
            Find real hackathons, build projects, and connect with teammates. Only authentic challenges posted by platform administrators are listed here.
          </p>
        </div>

        {/* Admin settings button */}
        {isAdminUser && (
          <Button
            onClick={() => setAdminPanelOpen(!adminPanelOpen)}
            variant={adminPanelOpen ? 'primary' : 'outline'}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider flex-shrink-0"
          >
            <Settings className="w-4 h-4" />
            {adminPanelOpen ? 'Close Management' : 'Admin Panel'}
          </Button>
        )}
      </div>

      {/* ADMIN HACKATHON MANAGEMENT CONSOLE */}
      {isAdminUser && adminPanelOpen && (
        <div className="bg-zinc-50 dark:bg-zinc-900/40 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-8">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Lock className="w-4.5 h-4.5 text-orange-500" />
              Admin Management Console
            </h2>
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="primary"
                size="sm"
                className="text-xs font-bold gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Create Hackathon
              </Button>
            )}
          </div>

          {isEditing && (
            <form onSubmit={handleSaveHackathon} className="space-y-4">
              <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                {editingId ? 'Edit Hackathon Details' : 'Create New Hackathon'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Hackathon Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="block w-full px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:border-orange-500 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Organizer *</label>
                  <input
                    type="text"
                    required
                    value={formOrganizer}
                    onChange={(e) => setFormOrganizer(e.target.value)}
                    className="block w-full px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:border-orange-500 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="block w-full px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:border-orange-500 text-sm"
                  >
                    <option value="AI/ML">AI/ML</option>
                    <option value="Web3">Web3</option>
                    <option value="SaaS">SaaS</option>
                    <option value="Mobile">Mobile</option>
                    <option value="Open Source">Open Source</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Banner Image URL</label>
                  <input
                    type="url"
                    value={formBannerUrl}
                    onChange={(e) => setFormBannerUrl(e.target.value)}
                    placeholder="https://example.com/image.png"
                    className="block w-full px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:border-orange-500 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Prize Pool</label>
                  <input
                    type="text"
                    value={formPrizePool}
                    onChange={(e) => setFormPrizePool(e.target.value)}
                    placeholder="e.g. $50,000"
                    className="block w-full px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:border-orange-500 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Team Size</label>
                  <input
                    type="text"
                    value={formTeamSize}
                    onChange={(e) => setFormTeamSize(e.target.value)}
                    placeholder="e.g. 1-4 builders"
                    className="block w-full px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:border-orange-500 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Start Date</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="block w-full px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:border-orange-500 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">End Date</label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="block w-full px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:border-orange-500 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Reg. Deadline</label>
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="block w-full px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:border-orange-500 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Official Website URL</label>
                  <input
                    type="url"
                    value={formWebsiteUrl}
                    onChange={(e) => setFormWebsiteUrl(e.target.value)}
                    placeholder="https://website.com"
                    className="block w-full px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:border-orange-500 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Registration URL</label>
                  <input
                    type="url"
                    value={formRegistrationUrl}
                    onChange={(e) => setFormRegistrationUrl(e.target.value)}
                    placeholder="https://register.com"
                    className="block w-full px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:border-orange-500 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="block w-full px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:border-orange-500 text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="primary" size="sm">
                  {editingId ? 'Save Changes' : 'Create Hackathon'}
                </Button>
                <Button type="button" onClick={resetForm} variant="outline" size="sm">
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Manage Hackathons List */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs text-zinc-400 uppercase tracking-wider">Existing Hackathons</h3>
            {hackathons.length > 0 ? (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-60 overflow-y-auto">
                {hackathons.map((h) => (
                  <div key={h.id} className="py-2.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-zinc-900 dark:text-white truncate">{h.name}</p>
                      <p className="text-xs text-zinc-500 truncate">{h.organizer} • {h.category}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleEditInit(h)}
                        className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => void handleDelete(h.id)}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">No hackathons posted yet.</p>
            )}
          </div>
        </div>
      )}

      {/* SEARCH BAR */}
      <div className="relative w-full max-w-2xl mx-auto">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
        </div>
        <input
          type="text"
          placeholder="Search hackathons..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 transition-all duration-200 shadow-sm text-sm"
        />
      </div>

      {/* CATEGORY & STATUS FILTERS */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar flex-nowrap md:flex-wrap w-full py-1">
        {(['All', 'Live', 'Upcoming', 'AI/ML', 'Web3', 'SaaS', 'Mobile', 'Open Source'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeFilter === filter
                ? 'bg-orange-500 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* FEATURED HACKATHONS */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-orange-500" />
            Featured Challenges
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">Open sprint boards currently accepting submissions and registrations.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
          </div>
        ) : filteredHackathons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch">
            {filteredHackathons.map((hack) => (
              <motion.div
                key={hack.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 hover:border-orange-500/20 dark:hover:border-orange-500/20 hover:shadow-md transition-all duration-200"
              >
                <div className="flex-1">
                  {/* Banner Image */}
                  {hack.banner_url && (
                    <div className="w-full h-32 sm:h-40 rounded-lg overflow-hidden mb-4 border border-zinc-100 dark:border-zinc-800">
                      <img src={hack.banner_url} alt={hack.name} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{hack.organizer}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      isLive(hack)
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}>
                      {isLive(hack) ? 'Live' : isUpcoming(hack) ? 'Upcoming' : 'Closed'}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-zinc-900 dark:text-white leading-tight mb-2">
                    {hack.name}
                  </h3>
                  
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3 mb-4">
                    {hack.description}
                  </p>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 border-t border-zinc-100 dark:border-zinc-800/80 pt-4 mb-4 text-xs">
                    {hack.prize_pool && (
                      <div className="space-y-1">
                        <span className="text-zinc-400 dark:text-zinc-500 font-medium block">Prize Pool</span>
                        <span className="font-bold text-orange-500 flex items-center text-sm">
                          <DollarSign className="w-3.5 h-3.5" />
                          {hack.prize_pool}
                        </span>
                      </div>
                    )}
                    {hack.start_date && (
                      <div className="space-y-1">
                        <span className="text-zinc-400 dark:text-zinc-500 font-medium block">Start Date</span>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                          {new Date(hack.start_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {hack.deadline && (
                      <div className="space-y-1">
                        <span className="text-zinc-400 dark:text-zinc-500 font-medium block">Deadline</span>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                          {new Date(hack.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {hack.team_size && (
                      <div className="space-y-1">
                        <span className="text-zinc-400 dark:text-zinc-500 font-medium block">Team Size</span>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                          {hack.team_size}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-5">
                    <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
                      {hack.category}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 mt-auto">
                  {hack.registration_url && (
                    <a
                      href={hack.registration_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-colors"
                    >
                      Register Now
                    </a>
                  )}
                  {hack.website_url && (
                    <a
                      href={hack.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/20 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">No hackathons available yet</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mx-auto">
              Check back later for upcoming development and design challenges.
            </p>
          </div>
        )}
      </section>

      {/* TEAM FORMATION BOARD */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            Team Formation Board
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">Connect with hackathon teams looking for complementary skills.</p>
        </div>

        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/20 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">No teams are recruiting yet</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mx-auto">
            Recruiting cards will appear here when builders start forming teams.
          </p>
        </div>
      </section>

      {/* HACKATHON PROJECTS SHOWCASE */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            Hackathon Showcase
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">Previous projects built and deployed during sprint challenges.</p>
        </div>

        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/20 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
            <Code className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">No hackathon projects have been submitted yet</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mx-auto">
            Submissions will be displayed once the challenges conclude.
          </p>
        </div>
      </section>

      {/* LEADERBOARD */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-orange-500" />
              Leaderboard
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">Top-performing makers ranked by hackathon points and activity metrics.</p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl w-fit">
            <button
              onClick={() => setLeaderboardTab('points')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                leaderboardTab === 'points'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Most Active
            </button>
            <button
              onClick={() => setLeaderboardTab('wins')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                leaderboardTab === 'wins'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Most Wins
            </button>
            <button
              onClick={() => setLeaderboardTab('joined')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                leaderboardTab === 'joined'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Most Joined
            </button>
          </div>
        </div>

        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/20 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">No leaderboard entries yet</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mx-auto">
            Rankings will update as participants earn points in hackathons.
          </p>
        </div>
      </section>

    </div>
  );
}
export default HackathonsPage;
