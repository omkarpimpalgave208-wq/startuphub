import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Loader2, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar } from '../components/ui/Avatar';
import type { Profile } from '../types';
import { api } from '../lib/api';

export function MakersPage() {
  const [makers, setMakers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMakers();
  }, []);

  const fetchMakers = async () => {
    try {
      const data = await api.getProfiles();
      setMakers(data);
    } catch (err) {
      console.error('Error fetching makers:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-full">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
          <Users className="w-7 h-7 sm:w-8 sm:h-8 text-orange-500" />
          Makers
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          Discover talented founders and builders in the community
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
        </div>
      ) : makers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {makers.map((maker) => (
            <motion.div
              key={maker.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
            >
              <Link to={`/profile/${maker.username}`} className="block w-full">
                <div className="w-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 hover:border-orange-500/30 dark:hover:border-orange-500/30 transition-all duration-200">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <Avatar
                      src={maker.avatar_url}
                      alt={maker.full_name || maker.username}
                      size="lg"
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-zinc-900 dark:text-white truncate">
                        {maker.full_name || maker.username}
                      </h3>
                      <p className="text-sm text-zinc-500 truncate">@{maker.username}</p>
                      
                      {maker.headline && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-2">
                          {maker.headline}
                        </p>
                      )}

                      <div className="flex items-center gap-3 sm:gap-4 mt-3 text-sm text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          {maker.products || 0} products
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Makers Onboarding Empty State - NO fake data */
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <Users className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">No builders signed up yet</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mx-auto">
            Get started by logging in and filling out your profile bio/avatar settings!
          </p>
        </div>
      )}
    </div>
  );
}