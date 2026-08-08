import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createRealtimeConnection } from '../services/realtimeService';
import { useLanguageProfile } from './LanguageProfileContext';
import * as friendsService from '../services/friendsService';

const FriendRequestsContext = createContext(null);

export function FriendRequestsProvider({ children }) {
  const { activeProfile } = useLanguageProfile();
  const socketRef = useRef(null);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [friends, setFriends] = useState([]);

  const refresh = useCallback(async () => {
    if (!activeProfile) return;
    try {
      const [requests, friendsData] = await Promise.all([
        friendsService.getPendingRequests(),
        friendsService.getFriends(),
      ]);
      setIncoming(requests.incoming || []);
      setOutgoing(requests.outgoing || []);
      setFriends(friendsData.friends || []);
    } catch (error) {
      // Real-time events still keep the badge roughly correct if this fails.
    }
  }, [activeProfile]);

  useEffect(() => {
    if (!activeProfile) {
      setIncoming([]);
      setOutgoing([]);
      setFriends([]);
      return undefined;
    }

    refresh();

    const socket = createRealtimeConnection();
    socketRef.current = socket;

    socket.on('connect', refresh);
    socket.on('friend:request', ({ from }) => {
      setIncoming((current) => (current.some((r) => r.id === from.id) ? current : [...current, from]));
    });
    socket.on('friend:accepted', () => refresh());
    socket.on('friend:removed', () => refresh());

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeProfile, refresh]);

  const acceptRequest = useCallback(async (friendId) => {
    await friendsService.acceptFriendRequest(friendId);
    setIncoming((current) => current.filter((r) => r.id !== friendId));
  }, []);

  const rejectRequest = useCallback(async (friendId) => {
    await friendsService.removeFriend(friendId);
    setIncoming((current) => current.filter((r) => r.id !== friendId));
  }, []);

  const cancelRequest = useCallback(async (friendId) => {
    await friendsService.removeFriend(friendId);
    setOutgoing((current) => current.filter((r) => r.id !== friendId));
  }, []);

  // 'friends' | 'incoming' | 'outgoing' | 'none' - lets any avatar/profile UI
  // decide whether "Add friend" makes sense for a given account id.
  const getFriendStatus = useCallback((accountId) => {
    if (!accountId) return 'none';
    if (friends.some((f) => f.id === accountId)) return 'friends';
    if (incoming.some((r) => r.id === accountId)) return 'incoming';
    if (outgoing.some((r) => r.id === accountId)) return 'outgoing';
    return 'none';
  }, [friends, incoming, outgoing]);

  const sendRequest = useCallback(async (accountId) => {
    await friendsService.sendFriendRequestByUserId(accountId);
    await refresh();
  }, [refresh]);

  const value = {
    incoming,
    outgoing,
    friends,
    unreadCount: incoming.length,
    refresh,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    getFriendStatus,
    sendRequest,
  };

  return <FriendRequestsContext.Provider value={value}>{children}</FriendRequestsContext.Provider>;
}

export function useFriendRequests() {
  const value = useContext(FriendRequestsContext);
  if (!value) throw new Error('useFriendRequests must be used within FriendRequestsProvider');
  return value;
}
