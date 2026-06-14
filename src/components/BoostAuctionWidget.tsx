import { useState } from 'react';
import { Zap, Timer, Flame, ArrowUpRight, Loader2, Info } from 'lucide-react';
import { Button } from './ui/Button';

interface ActiveBoost {
  productId: string;
  productName: string;
  logoUrl: string | null;
  bidAmount: number;
  expiresAt: number;
  user_id: string;
}

interface UserStartup {
  id: string;
  name: string;
  logoUrl: string | null;
  xp: number;
}

interface BoostAuctionWidgetProps {
  currentBoost: ActiveBoost | null;
  userStartup: UserStartup | null;
  onBid: (amount: number) => Promise<void>;
  loading: boolean;
}

export function BoostAuctionWidget({ currentBoost, userStartup, onBid, loading }: BoostAuctionWidgetProps) {
  const [bidAmount, setBidAmount] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const now = Date.now();
  const timeRemaining = currentBoost ? currentBoost.expiresAt - now : 0;
  const isExpired = timeRemaining <= 0;

  // Format countdown string
  const formatCountdown = (ms: number) => {
    if (ms <= 0) return 'Expired';
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);

    const displayMins = mins % 60;
    return `${hours}h ${displayMins}m remaining`;
  };

  const handleBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!userStartup) {
      setErrorMsg('You must own a launched startup to place a bid!');
      return;
    }

    const parsedBid = parseInt(bidAmount, 10);
    if (isNaN(parsedBid) || parsedBid <= 0) {
      setErrorMsg('Please enter a valid bid amount!');
      return;
    }

    const minBid = currentBoost && !isExpired ? currentBoost.bidAmount + 50 : 100;
    if (parsedBid < minBid) {
      setErrorMsg(`Minimum bid must be at least ${minBid} XP!`);
      return;
    }

    if (parsedBid > userStartup.xp) {
      setErrorMsg(`Insufficient XP! You only have ${userStartup.xp} XP available.`);
      return;
    }

    try {
      await onBid(parsedBid);
      setBidAmount('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Bid placement failed!');
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-lg relative overflow-hidden flex flex-col w-full">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600" />
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500 animate-pulse" />
          <h3 className="font-extrabold text-sm sm:text-base text-zinc-900 dark:text-white uppercase tracking-wider">
            Boost Auction
          </h3>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-[10px] font-bold text-amber-500 border border-amber-500/20">
          FEATURED
        </div>
      </div>

      {/* Active Boost Slot Card */}
      <div className="mt-4 space-y-4 flex-1">
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-850">
          <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-2">
            Active Boost Holder (1.35x Multiplier)
          </span>

          {currentBoost && !isExpired ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 flex-shrink-0 bg-white">
                {currentBoost.logoUrl ? (
                  <img src={currentBoost.logoUrl} alt={currentBoost.productName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-black text-sm">
                    {currentBoost.productName[0]}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-black text-xs text-zinc-900 dark:text-white truncate">
                  {currentBoost.productName}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-zinc-400 font-bold">
                  <span className="text-amber-500 font-extrabold">{currentBoost.bidAmount} XP bid</span>
                  <span>•</span>
                  <span className="flex items-center gap-0.5">
                    <Timer className="w-3 h-3 text-zinc-450" />
                    {formatCountdown(timeRemaining)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-zinc-450 dark:text-zinc-600">
              <Flame className="w-6 h-6 mx-auto mb-1 opacity-40" />
              <p className="text-xs font-bold">Auction Open</p>
              <p className="text-[10px] opacity-75 mt-0.5">Place a bid to claim the 1.35x score boost!</p>
            </div>
          )}
        </div>

        {/* Bid Submission Panel */}
        {userStartup ? (
          <form onSubmit={handleBidSubmit} className="space-y-3 pt-1">
            <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 px-1">
              <span>Your Startup: <strong className="text-zinc-700 dark:text-zinc-300">{userStartup.name}</strong></span>
              <span>XP Available: <strong className="text-amber-500">{userStartup.xp} XP</strong></span>
            </div>

            <div className="relative">
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={`Min bid: ${currentBoost && !isExpired ? currentBoost.bidAmount + 50 : 100} XP`}
                disabled={loading}
                className="w-full pl-3 pr-16 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 text-xs font-semibold text-zinc-900 dark:text-white placeholder-zinc-450 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-500 uppercase">
                XP POINTS
              </div>
            </div>

            {errorMsg && (
              <p className="text-[10px] font-bold text-red-500 pl-1">
                {errorMsg}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/10"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  Place Bid <ArrowUpRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>

            <div className="flex gap-1.5 items-start p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950/20 text-[9px] text-zinc-400 dark:text-zinc-550 border border-zinc-150 dark:border-zinc-850">
              <Info className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mt-0.5" />
              <p className="leading-normal">
                Bidding locks your XP points as system credits. If outbid, points are released. The boost multiplier (1.35x) applies live and pins your startup for up to 24 hours.
              </p>
            </div>
          </form>
        ) : (
          <div className="p-3.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/10 border border-zinc-150 dark:border-zinc-850 text-center">
            <p className="text-[10px] text-zinc-400 font-semibold leading-normal">
              Sign in as a launched founder to bid your XP credits and boost your startup's leaderboard position.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
