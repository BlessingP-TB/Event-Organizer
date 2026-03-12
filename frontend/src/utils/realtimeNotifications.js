import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
const SOCKET_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

let socketInstance = null;
let activeSubscribers = 0;

const getAccessToken = () => {
  try {
    return localStorage.getItem('accessToken');
  } catch (_) {
    return null;
  }
};

const getSocket = () => {
  const token = getAccessToken();
  if (!token) return null;

  const shouldRecreate =
    !socketInstance ||
    socketInstance.auth?.token !== token;

  if (shouldRecreate) {
    if (socketInstance) {
      socketInstance.disconnect();
    }

    socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token },
      autoConnect: true,
    });
  }

  return socketInstance;
};

export const subscribeToNotificationStream = (onNotification) => {
  const socket = getSocket();
  if (!socket) return () => {};

  const handler = (notification) => {
    if (typeof onNotification === 'function') {
      onNotification(notification);
    }
    window.dispatchEvent(new Event('notificationsUpdated'));
  };

  socket.on('notification:new', handler);
  activeSubscribers += 1;

  return () => {
    socket.off('notification:new', handler);
    activeSubscribers = Math.max(0, activeSubscribers - 1);

    if (activeSubscribers === 0 && socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
  };
};
