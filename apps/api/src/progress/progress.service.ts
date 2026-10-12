import { Injectable } from '@nestjs/common';
import { Locale } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { gradeQuiz } from '../training/grading';
import { TrainingService } from '../training/training.service';

/** Most recent practice answers taken into account. */
const ATTEMPT_WINDOW = 500;
const RECENT_CONTESTS = 5;

export interface SignalTally {
  code: string;
  name: string;
  spotted: number;
  missed: number;
}

/** Adds one graded answer to the per-signal tally (pure). */
export function tallySignals(
  tally: Map<string, { spotted: number; missed: number }>,
  matched: string[],
  missed: string[],
): void {
  const bump = (code: string, key: 'spotted' | 'missed') => {
    const row = tally.get(code) ?? { spotted: 0, missed: 0 };
    row[key]++;
    tally.set(code, row);
  };
  for (const c of matched) bump(c, 'spotted');
  for (const c of missed) bump(c, 'missed');
}

/**
 * "My progress" for the /me page: practice and contest combined, graded by signal (R7) and in both
 * directions (R11: false alarms count as a weakness too). Read-only; only the caller's own data (R5).
 */
@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly training: TrainingService,
  ) {}

  async forUser(userId: string, locale: Locale) {
    const signalsOf = {
      select: {
        isScam: true,
        signals: { select: { signal: { select: { code: true } } } },
      },
    };
    const [info, attempts, contestItems, contests, contestCount] = await Promise.all([
      this.training.signalInfoMap(locale),
      this.prisma.quizAttempt.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: ATTEMPT_WINDOW,
        select: {
          questionId: true,
          answeredScam: true,
          selectedSignals: true,
          question: signalsOf,
        },
      }),
      this.prisma.contestItem.findMany({
        where: { session: { userId, status: 'finished' } },
        select: {
          outcome: true,
          answeredScam: true,
          selectedSignals: true,
          question: signalsOf,
        },
      }),
      this.prisma.contestSession.findMany({
        where: { userId, status: 'finished' },
        orderBy: { finishedAt: 'desc' },
        take: RECENT_CONTESTS,
        select: { id: true, finishedAt: true, score: true, maxScore: true },
      }),
      this.prisma.contestSession.count({ where: { userId, status: 'finished' } }),
    ]);

    const tally = new Map<string, { spotted: number; missed: number }>();
    let correct = 0;
    let falseAlarms = 0;
    let missedScams = 0;
    const grade = (
      q: { isScam: boolean; signals: { signal: { code: string } }[] },
      answeredScam: boolean,
      selected: string[],
    ) => {
      const g = gradeQuiz({
        isScam: q.isScam,
        correctSignals: q.signals.map((s) => s.signal.code),
        answeredScam,
        selectedSignals: selected,
      });
      if (g.classifyCorrect) correct++;
      if (!q.isScam && answeredScam) falseAlarms++;
      if (q.isScam && !answeredScam) missedScams++;
      tallySignals(tally, g.matchedSignals, g.missedSignals);
    };

    for (const a of attempts) grade(a.question, a.answeredScam, a.selectedSignals);
    // Contest questions skipped or timed out count as a wrong call with nothing spotted.
    for (const it of contestItems) {
      const answered = it.outcome === 'answered';
      grade(
        it.question,
        answered ? Boolean(it.answeredScam) : !it.question.isScam,
        answered ? it.selectedSignals : [],
      );
    }

    const answered = attempts.length + contestItems.length;
    const signals: SignalTally[] = [...tally]
      .map(([code, t]) => ({ code, name: info.get(code)?.name ?? code, ...t }))
      .sort((a, b) => missRate(b) - missRate(a) || b.missed - a.missed);

    return {
      practice: {
        answers: attempts.length,
        scenarios: new Set(attempts.map((a) => a.questionId)).size,
      },
      answered,
      correct,
      falseAlarms,
      missedScams,
      contests: {
        count: contestCount,
        best: contests.length ? Math.max(...contests.map(pct)) : null,
        recent: contests.map((c) => ({
          id: c.id,
          finishedAt: c.finishedAt,
          score: c.score,
          maxScore: c.maxScore,
        })),
      },
      signals,
    };
  }
}

const missRate = (s: { spotted: number; missed: number }) =>
  s.missed / Math.max(1, s.spotted + s.missed);
const pct = (c: { score: number; maxScore: number }) =>
  c.maxScore ? Math.round((c.score / c.maxScore) * 100) : 0;
