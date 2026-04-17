
"use client";

import { useEffect, useCallback } from 'react';
import { updateUser } from '@/services/user-service';

const HEARTBEAT_INTERVAL = 60 * 1000; // 1 minute

export function useUserHeartbeat(uid: string) {

  const sendHeartbeat = useCallback(async () => {
    if (!uid || !document.hasFocus()) {
        return;
    }
    try {
      await updateUser(uid, { last_seen: new Date() });
    } catch (error) {
      console.error("Failed to send user heartbeat:", error);
    }
  }, [uid]);

  useEffect(() => {
    if (uid) {
      // Send initial heartbeat immediately
      sendHeartbeat();

      // Set up interval to send heartbeat periodically
      const intervalId = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

      // Clean up interval on component unmount
      return () => clearInterval(intervalId);
    }
  }, [uid, sendHeartbeat]);

}
