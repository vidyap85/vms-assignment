import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../store/authStore";

// The socket instance is created once (disconnected) at module load so that
// components can always call getSocket() and register listeners immediately,
// regardless of whether a session has been established yet. Connection is
// driven purely by auth-store state below.
const socket: Socket = io({
  path: "/socket.io",
  autoConnect: false,
  transports: ["websocket", "polling"],
});

export function getSocket(): Socket {
  return socket;
}

export function connectSocket(token: string): Socket {
  socket.auth = { token };
  if (socket.connected) {
    socket.disconnect().connect();
  } else {
    socket.connect();
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket.connected) socket.disconnect();
}

// Keep the socket connected/authenticated in lockstep with the auth store:
// connect as soon as a session exists, reconnect with a fresh token after a
// silent refresh, and tear down on logout. This runs on the store
// subscription (synchronous, outside React) so it can't race component
// mount/effect ordering.
let lastToken: string | null = null;
useAuthStore.subscribe((state) => {
  const token = state.accessToken;
  if (token === lastToken) return;
  lastToken = token;
  if (!token) {
    disconnectSocket();
    return;
  }
  connectSocket(token);
});
