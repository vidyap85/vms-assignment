import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { env } from '../config/env';

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: env.webOrigin, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Unauthorized'));
    try {
      const payload = verifyAccessToken(token);
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join('all');
  });

  return io;
}

function emit(event: string, payload: unknown) {
  io?.to('all').emit(event, payload);
}

export function getConnectedClientCount(): number {
  return io ? io.sockets.sockets.size : 0;
}

export const socketEvents = {
  cameraStatus: (payload: unknown) => emit('camera:status', payload),
  eventNew: (payload: unknown) => emit('event:new', payload),
  recordingStatus: (payload: unknown) => emit('recording:status', payload),
  dashboardStats: (payload: unknown) => emit('dashboard:stats', payload),
  auditNew: (payload: unknown) => emit('audit:new', payload),
};
