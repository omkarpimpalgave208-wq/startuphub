/**
 * Checks if a user is currently online based on their last_seen timestamp.
 * A user is considered online ONLY if the last_seen timestamp is within the last 2 minutes (120 seconds).
 */
export function isUserOnline(lastSeen: string | Date | null | undefined): boolean {
  if (!lastSeen) return false;
  
  const lastSeenDate = new Date(lastSeen);
  const diffInMs = Date.now() - lastSeenDate.getTime();
  const diffInMinutes = diffInMs / (1000 * 60);

  // Return true if diff is between 0 and 2 minutes
  return diffInMinutes >= 0 && diffInMinutes <= 2;
}

/**
 * Formats a user's last_seen timestamp into a highly readable human presence status string.
 * Output examples: "Active now", "Last seen 5m ago", "Last seen yesterday"
 */
export function formatLastSeen(lastSeen: string | Date | null | undefined): string {
  if (!lastSeen) return 'Offline';
  
  const lastSeenDate = new Date(lastSeen);
  const now = Date.now();
  const diffInSeconds = Math.floor((now - lastSeenDate.getTime()) / 1000);

  if (diffInSeconds < 0) return 'Offline';
  if (diffInSeconds <= 120) return 'Active now'; // Under 2 minutes is considered "Active now"

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `Last seen ${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `Last seen ${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return 'Last seen yesterday';
  }
  if (diffInDays < 7) {
    return `Last seen ${diffInDays}d ago`;
  }

  return `Last seen on ${lastSeenDate.toLocaleDateString()}`;
}
