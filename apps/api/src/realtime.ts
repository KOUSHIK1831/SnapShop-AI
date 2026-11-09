import type { Server } from 'socket.io';

let realtime: Server | null = null;

export function setRealtimeServer(server: Server | null): void {
  realtime = server;
}

export function emitToUser(
  userId: string,
  event: string,
  payload: unknown,
): void {
  realtime?.to(`user:${userId}`).emit(event, payload);
}

export function emitToSeller(
  userId: string,
  event: string,
  payload: unknown,
): void {
  realtime?.to(`seller:${userId}`).emit(event, payload);
}
