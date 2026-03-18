import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('[WS] Connected:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('[WS] Disconnected');
    });
  }
  return socket;
}

export function joinAssignment(assignmentId: string) {
  const s = getSocket();
  s.emit('join:assignment', assignmentId);
}

export function leaveAssignment(assignmentId: string) {
  const s = getSocket();
  s.emit('leave:assignment', assignmentId);
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
