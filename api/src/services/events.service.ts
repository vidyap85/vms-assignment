import { EventSeverity, EventType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { socketEvents } from './socket.service';

export async function raiseEvent(input: {
  type: EventType;
  cameraId?: string | null;
  userId?: string | null;
  severity?: EventSeverity;
  description: string;
}) {
  const event = await prisma.event.create({
    data: {
      type: input.type,
      cameraId: input.cameraId ?? null,
      userId: input.userId ?? null,
      severity: input.severity ?? 'INFO',
      description: input.description,
    },
    include: { camera: true, user: true },
  });
  socketEvents.eventNew(event);
  return event;
}

export async function recordAudit(input: {
  userId?: string | null;
  action: string;
  details?: string;
  ipAddress?: string | null;
}) {
  const log = await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      details: input.details,
      ipAddress: input.ipAddress ?? null,
    },
    include: { user: true },
  });
  socketEvents.auditNew(log);
  return log;
}
