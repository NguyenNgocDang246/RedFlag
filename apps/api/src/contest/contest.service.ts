import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ContestOutcome, Locale, Prisma } from '@prisma/client';
import { CONTEST_ITEM_SECONDS, CONTEST_SIZE } from '@redflag/shared';
import { PrismaService } from '../prisma/prisma.service';
import { gradeQuiz } from '../training/grading';
import { pickSet } from '../training/pick-set';
import { QUIZ_INCLUDE, TrainingService } from '../training/training.service';
import { maxPointsFor, scoreContestItem } from './contest-scoring';
import { deadlineOf, onAnswer, onServe } from './contest-state';

const HISTORY_SIZE = 20;

type Tx = Prisma.TransactionClient;

/**
 * Contest (Phase 3A): server-authoritative graded round.
 * The server draws the questions, shows them one at a time (each exactly once), locks every answer
 * and only reveals answers/explanations once the round is finished. All lookups are scoped to the
 * owner (R5) — someone else's round is a 404.
 */
@Injectable()
export class ContestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly training: TrainingService,
  ) {}

  /** New round: closes any unfinished one, then draws CONTEST_SIZE questions mixing safe and scam (R11). */
  async start(userId: string, locale: Locale) {
    const pool = await this.prisma.quizQuestion.findMany({
      where: { status: 'published' },
      select: { id: true, isScam: true, _count: { select: { signals: true } } },
    });
    // No history → a purely random draw; pickSet still caps/guarantees the safe share.
    const { ids } = pickSet({ pool, limit: CONTEST_SIZE });
    if (!ids.length) throw new NotFoundException('No questions available');
    const byId = new Map(pool.map((q) => [q.id, q]));

    return this.prisma.$transaction(async (tx) => {
      const active = await tx.contestSession.findMany({
        where: { userId, status: 'active' },
        select: { id: true },
      });
      for (const s of active) await this.finalize(tx, s.id);
      return tx.contestSession.create({
        data: {
          userId,
          locale,
          itemSeconds: CONTEST_ITEM_SECONDS,
          items: {
            create: ids.map((questionId, position) => {
              const q = byId.get(questionId)!;
              return {
                position,
                questionId,
                maxPoints: maxPointsFor(q.isScam, q._count.signals),
              };
            }),
          },
        },
        select: { id: true },
      });
    });
  }

  /**
   * The question being worked on. Asking again for a question already shown forfeits it (reload /
   * back / reopened link), or times it out if its deadline passed — then the next one is served.
   * Content is in the round's own language, so switching the UI language never needs a re-serve.
   */
  async current(userId: string, id: string) {
    const session = await this.mustOwn(userId, id);
    const { locale } = session;
    if (session.status === 'finished') return { finished: true as const };

    let skipped: 'forfeit' | 'timeout' | undefined;
    let index = session.currentIndex;
    for (;;) {
      const item = await this.prisma.contestItem.findUnique({
        where: { sessionId_position: { sessionId: id, position: index } },
      });
      if (!item) {
        await this.prisma.$transaction((tx) => this.finalize(tx, id));
        return { finished: true as const, skipped };
      }
      const now = new Date();
      const decision = item.outcome ? 'closed' : onServe(item, now, session.itemSeconds);

      if (decision === 'serve') {
        const served = await this.prisma.contestItem.updateMany({
          where: { id: item.id, servedAt: null },
          data: { servedAt: now },
        });
        // Lost a race with a parallel request that served it first → that one owns it; this is a re-serve.
        if (served.count === 1) {
          const [info, seqs, q] = await Promise.all([
            this.training.signalInfoMap(locale),
            this.training.seqMap(),
            this.prisma.quizQuestion.findUniqueOrThrow({
              where: { id: item.questionId },
              include: QUIZ_INCLUDE,
            }),
          ]);
          return {
            finished: false as const,
            skipped,
            position: index,
            total: await this.prisma.contestItem.count({ where: { sessionId: id } }),
            itemSeconds: session.itemSeconds,
            deadline: deadlineOf(now, session.itemSeconds).toISOString(),
            question: this.training.toPublicQuestion(q, locale, info, seqs),
          };
        }
        continue;
      }

      if (decision !== 'closed') {
        await this.close(item.id, decision === 'timeout' ? 'timeout' : 'forfeited');
        skipped = decision;
      }
      await this.prisma.contestSession.updateMany({
        where: { id, currentIndex: index },
        data: { currentIndex: index + 1 },
      });
      index += 1;
    }
  }

  /** Locks in the answer for `position`. Returns no correctness — results come at the end. */
  async answer(
    userId: string,
    id: string,
    position: number,
    answeredScam: boolean,
    selectedSignals: string[],
    selectedSpots: string[] = [],
  ) {
    const session = await this.mustOwn(userId, id);
    if (session.status === 'finished')
      throw new ConflictException('Contest already finished');
    const item = await this.prisma.contestItem.findUnique({
      where: { sessionId_position: { sessionId: id, position } },
      include: {
        question: {
          select: {
            isScam: true,
            signals: { select: { signal: { select: { code: true } } } },
          },
        },
      },
    });
    if (!item) throw new NotFoundException('Question not found');

    const now = new Date();
    const decision = onAnswer(item, session.currentIndex, now, session.itemSeconds);
    if (decision === 'wrong-position' || decision === 'not-served') {
      throw new ConflictException('This question is no longer open');
    }

    let timedOut = false;
    if (decision === 'timeout') {
      timedOut = (await this.close(item.id, 'timeout')) === 1;
    } else {
      const picks = answeredScam ? selectedSignals : [];
      const score = scoreContestItem({
        isScam: item.question.isScam,
        correctSignals: item.question.signals.map((s) => s.signal.code),
        answeredScam,
        selectedSignals: picks,
      });
      const saved = await this.prisma.contestItem.updateMany({
        where: { id: item.id, outcome: null },
        data: {
          outcome: 'answered',
          answeredAt: now,
          answeredScam,
          selectedSignals: picks,
          selectedSpots: answeredScam ? selectedSpots : [],
          classifyCorrect: score.classifyCorrect,
          points: score.points,
        },
      });
      if (saved.count === 0)
        throw new ConflictException('This question is no longer open');
    }

    await this.prisma.contestSession.updateMany({
      where: { id, currentIndex: position },
      data: { currentIndex: position + 1 },
    });
    const total = await this.prisma.contestItem.count({ where: { sessionId: id } });
    const finished = position + 1 >= total;
    if (finished) await this.prisma.$transaction((tx) => this.finalize(tx, id));
    return { finished, timedOut };
  }

  /** Summary of a finished round: score, per-signal strengths/weaknesses, and every question reviewed. */
  async result(userId: string, id: string, locale: Locale) {
    const session = await this.mustOwn(userId, id);
    if (session.status !== 'finished')
      throw new ConflictException('Contest not finished yet');
    const [info, seqs, items] = await Promise.all([
      this.training.signalInfoMap(locale),
      this.training.seqMap(),
      this.prisma.contestItem.findMany({
        where: { sessionId: id },
        orderBy: { position: 'asc' },
        include: { question: { include: QUIZ_INCLUDE } },
      }),
    ]);

    const signals = new Map<
      string,
      { code: string; name: string; spotted: number; missed: number }
    >();
    let correct = 0;
    let falseAlarms = 0;
    let missedScams = 0;
    let decoyPicks = 0;

    const reviewed = items.map((it) => {
      const q = it.question;
      const answered = it.outcome === 'answered';
      // Unanswered (forfeited / timed out) = wrong call, nothing spotted.
      const grade = gradeQuiz({
        isScam: q.isScam,
        correctSignals: q.signals.map((s) => s.signal.code),
        answeredScam: answered ? Boolean(it.answeredScam) : !q.isScam,
        selectedSignals: answered ? it.selectedSignals : [],
      });
      if (answered && grade.classifyCorrect) correct++;
      if (answered && !q.isScam && it.answeredScam) falseAlarms++;
      if (q.isScam && !(answered && it.answeredScam)) missedScams++;
      decoyPicks += grade.wrongSignals.length;
      const tally = (code: string, key: 'spotted' | 'missed') => {
        const row = signals.get(code) ?? {
          code,
          name: info.get(code)?.name ?? code,
          spotted: 0,
          missed: 0,
        };
        row[key]++;
        signals.set(code, row);
      };
      for (const c of grade.matchedSignals) tally(c, 'spotted');
      for (const c of grade.missedSignals) tally(c, 'missed');

      return {
        position: it.position,
        outcome: it.outcome,
        points: it.points,
        maxPoints: it.maxPoints,
        answeredScam: answered ? it.answeredScam : null,
        selectedSignals: answered ? it.selectedSignals : [],
        selectedSpots: answered ? it.selectedSpots : [],
        question: this.training.toPublicQuestion(q, locale, info, seqs),
        review: this.training.buildReview(q, grade, locale, info),
      };
    });

    return {
      id: session.id,
      startedAt: session.startedAt,
      finishedAt: session.finishedAt,
      score: session.score,
      maxScore: session.maxScore,
      total: items.length,
      correct,
      falseAlarms,
      missedScams,
      decoyPicks,
      // Weakest first: most missed, then fewest spotted.
      signals: [...signals.values()].sort(
        (a, b) => b.missed - a.missed || a.spotted - b.spotted,
      ),
      items: reviewed,
    };
  }

  /** Finished rounds (newest first) + the unfinished one, if any. */
  async history(userId: string) {
    const [active, rows] = await Promise.all([
      this.prisma.contestSession.findFirst({
        where: { userId, status: 'active' },
        orderBy: { startedAt: 'desc' },
        select: { id: true, startedAt: true },
      }),
      this.prisma.contestSession.findMany({
        where: { userId, status: 'finished' },
        orderBy: { startedAt: 'desc' },
        take: HISTORY_SIZE,
        select: {
          id: true,
          startedAt: true,
          finishedAt: true,
          score: true,
          maxScore: true,
          _count: { select: { items: true } },
        },
      }),
    ]);
    return {
      active,
      items: rows.map(({ _count, ...r }) => ({ ...r, total: _count.items })),
    };
  }

  private async mustOwn(userId: string, id: string) {
    const session = await this.prisma.contestSession.findFirst({ where: { id, userId } });
    if (!session) throw new NotFoundException('Contest not found');
    return session;
  }

  /** Closes an open item with 0 points. Returns 1 if this call closed it. */
  private async close(itemId: string, outcome: Exclude<ContestOutcome, 'answered'>) {
    const r = await this.prisma.contestItem.updateMany({
      where: { id: itemId, outcome: null },
      data: { outcome, ...(outcome === 'timeout' ? { answeredAt: new Date() } : {}) },
    });
    return r.count;
  }

  /** Ends a round: unanswered questions are forfeited, totals are frozen. */
  private async finalize(tx: Tx, sessionId: string) {
    await tx.contestItem.updateMany({
      where: { sessionId, outcome: null },
      data: { outcome: 'forfeited' },
    });
    const sums = await tx.contestItem.aggregate({
      where: { sessionId },
      _sum: { points: true, maxPoints: true },
    });
    await tx.contestSession.updateMany({
      where: { id: sessionId, status: 'active' },
      data: {
        status: 'finished',
        finishedAt: new Date(),
        score: sums._sum.points ?? 0,
        maxScore: sums._sum.maxPoints ?? 0,
      },
    });
  }
}
