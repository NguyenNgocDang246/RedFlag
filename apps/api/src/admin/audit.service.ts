import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuditAction = 'create' | 'update' | 'delete' | 'publish' | 'unpublish';
export type AuditEntity = 'category' | 'signal' | 'quiz' | 'brand';

export interface AuditEntry {
  /** null = change made via the data CLI (no user); `via: 'cli'` is recorded in changes. */
  actorId: string | null;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  changes?: unknown;
}

/** Edit audit log. Written in the SAME transaction as the change so they never diverge. */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(tx: Prisma.TransactionClient, e: AuditEntry) {
    const changes =
      e.actorId === null
        ? {
            via: 'cli',
            ...(e.changes && typeof e.changes === 'object' ? (e.changes as object) : {}),
          }
        : e.changes;
    return tx.auditLog.create({
      data: {
        actorId: e.actorId,
        action: e.action,
        entity: e.entity,
        entityId: e.entityId,
        changes:
          changes === undefined ? Prisma.JsonNull : (changes as Prisma.InputJsonValue),
      },
    });
  }

  async list(filter: { entity?: string; entityId?: string; take?: number }) {
    const rows = await this.prisma.auditLog.findMany({
      where: {
        entity: filter.entity || undefined,
        entityId: filter.entityId || undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(filter.take ?? 100, 200),
      include: { actor: { select: { email: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      changes: r.changes,
      actor: r.actor?.email ?? null,
      createdAt: r.createdAt,
    }));
  }
}
