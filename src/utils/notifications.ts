/**
 * Utility to manage Web Push notification structures and placeholders.
 */

export async function requestNotificationPermission(): Promise<'default' | 'denied' | 'granted'> {
  if (!('Notification' in window)) {
    console.info('This browser does not support desktop notifications');
    return 'default';
  }

  try {
    const permission = await Notification.requestPermission();
    console.info('[PWA Notifications] Permission status:', permission);
    return permission;
  } catch (err) {
    console.warn('[PWA Notifications] Error requesting permission:', err);
    return 'default';
  }
}

export function showLocalNotification(title: string, body: string, icon = '/favicon.png') {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  try {
    const options = {
      body,
      icon,
      badge: '/favicon.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    };

    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (err) {
    console.warn('[PWA Notifications] Failed to trigger local notification:', err);
  }
}

/**
 * Placeholder hook for Web Push token retrieval (Firebase / VAPID).
 * In the future, this can send the token to Supabase profiles or your push service database.
 */
export async function registerPushNotificationsServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    console.info('[PWA Notifications] Service Worker ready for push subscription:', registration);
    
    // Future VAPID key registration:
    // const subscription = await registration.pushManager.subscribe({
    //   userVisibleOnly: true,
    //   applicationServerKey: 'YOUR_VAPID_PUBLIC_KEY'
    // });
    // console.info('[PWA Notifications] Subscription Token:', JSON.stringify(subscription));
  } catch (err) {
    console.warn('[PWA Notifications] Failed to set up push manager:', err);
  }
}
