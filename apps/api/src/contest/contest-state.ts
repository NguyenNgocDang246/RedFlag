import { CONTEST_GRACE_SECONDS } from '@redflag/shared';

/**
 * Contest item lifecycle — pure decisions (no I/O), applied by ContestService.
 * Rule: a question is shown exactly once. Asking for it again before answering (reload, back,
 * reopened link) forfeits it; answering after the deadline (+ grace) is a timeout.
 */
export interface ItemState {
  servedAt: Date | null;
  outcome: string | null;
}

/** Deadline shown to the client (no grace). */
export function deadlineOf(servedAt: Date, itemSeconds: number): Date {
  return new Date(servedAt.getTime() + itemSeconds * 1000);
}

/** Past the deadline + grace → the answer no longer counts. */
export function isExpired(servedAt: Date, now: Date, itemSeconds: number): boolean {
  return (
    now.getTime() > servedAt.getTime() + (itemSeconds + CONTEST_GRACE_SECONDS) * 1000
  );
}

/**
 * What happens when the client asks for the current question:
 * - `serve`: first time → record servedAt and show it;
 * - `timeout`: shown before and its deadline passed → close it, move on;
 * - `forfeit`: shown before, still within time, but requested again → close it, move on.
 */
export type ServeDecision = 'serve' | 'timeout' | 'forfeit';

export function onServe(item: ItemState, now: Date, itemSeconds: number): ServeDecision {
  if (!item.servedAt) return 'serve';
  // No grace here: the client's countdown asks for the next question right at the deadline.
  return now >= deadlineOf(item.servedAt, itemSeconds) ? 'timeout' : 'forfeit';
}

/**
 * What happens to an answer for `position`:
 * - `wrong-position`: not the question being worked on (stale tab, replay) → rejected;
 * - `not-served`: answering a question that was never shown → rejected;
 * - `timeout`: too late → recorded as 0;
 * - `accept`: graded.
 */
export type AnswerDecision = 'wrong-position' | 'not-served' | 'timeout' | 'accept';

export function onAnswer(
  item: ItemState & { position: number },
  currentIndex: number,
  now: Date,
  itemSeconds: number,
): AnswerDecision {
  if (item.position !== currentIndex || item.outcome) return 'wrong-position';
  if (!item.servedAt) return 'not-served';
  return isExpired(item.servedAt, now, itemSeconds) ? 'timeout' : 'accept';
}
