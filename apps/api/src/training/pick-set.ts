/** Questions per practice round. */
export const SET_SIZE = 10;

/** Fisher–Yates shuffle (returns a copy, input untouched). */
export function shuffle<T>(items: T[], rand: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface PoolItem {
  id: string;
  isScam: boolean;
}

/** User's status on a question: correct at least once (`solved`) or only wrong so far. */
export type AttemptStatus = 'solved' | 'attempted';

export interface PickArgs {
  pool: PoolItem[];
  /** Empty for guests (no history). */
  history?: Map<string, AttemptStatus>;
  /** Questions already seen this session ("Continue 10 more") — not drawn again. */
  exclude?: Set<string>;
  limit?: number;
  rand?: () => number;
}

/** Max share of SAFE questions in a round — most real-world messages a trainee is quizzed on are scams. */
export const SAFE_RATIO = 0.3;

/** Safe questions allowed next to `scams` scam questions: ≤ SAFE_RATIO of the round, but at least 1 (R11). */
const safeCap = (scams: number) => Math.max(1, Math.floor((scams * SAFE_RATIO) / (1 - SAFE_RATIO)));

/**
 * Draws a round from the filtered pool: untried → wrong → solved, shuffled within each group.
 * - Safe questions make up at most ~SAFE_RATIO of the round (fewer when scams are scarce, e.g. a
 *   signal filter that matches few scams), so "safe" never dominates.
 * - R11: if the pool has safe questions, the round includes at least one — otherwise always
 *   picking "scam" would be all correct.
 * - Safe questions only ever accompany scams: a pool with no scams left gives an empty round
 *   (an all-safe round would let "always answer safe" win).
 * `remaining` = unseen questions that later rounds can still draw under the same rules.
 */
export function pickSet({ pool, history, exclude, limit = SET_SIZE, rand }: PickArgs): {
  ids: string[];
  remaining: number;
} {
  const candidates = exclude?.size ? pool.filter((q) => !exclude.has(q.id)) : pool;
  const status = (id: string) => history?.get(id);
  const ordered = [
    ...shuffle(candidates.filter((q) => !status(q.id)), rand),
    ...shuffle(candidates.filter((q) => status(q.id) === 'attempted'), rand),
    ...shuffle(candidates.filter((q) => status(q.id) === 'solved'), rand),
  ];
  const scams = ordered.filter((q) => q.isScam);
  const safes = ordered.filter((q) => !q.isScam);
  const size = Math.max(1, limit);

  const wantSafe = scams.length && safes.length ? Math.max(1, Math.round(size * SAFE_RATIO)) : 0;
  const takenScams = scams.slice(0, size - Math.min(wantSafe, safes.length));
  const takenSafes = safes.slice(0, Math.min(wantSafe, safeCap(takenScams.length)));
  const picked = [...takenScams, ...takenSafes];

  const scamsLeft = scams.length - takenScams.length;
  const safesLeft = safes.length - takenSafes.length;
  const remaining = scamsLeft === 0 ? 0 : scamsLeft + Math.min(safesLeft, safeCap(scamsLeft));

  return { ids: shuffle(picked, rand).map((q) => q.id), remaining };
}
