import { useEffect, useRef } from "react";
import { getSocket } from "../lib/socket";

/**
 * Subscribes to a Socket.IO event on the shared app socket for the lifetime
 * of the component. Always invokes the latest handler passed in, without
 * needing the caller to memoize it.
 */
export function useSocketEvent<T = unknown>(event: string, handler: (payload: T) => void): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();
    const listener = (payload: T) => handlerRef.current(payload);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [event]);
}
