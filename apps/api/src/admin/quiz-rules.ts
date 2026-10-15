import {
  RULE_MSG,
  SUPPORTED_LOCALES,
  checkQuizHotspots,
  checkScenarioShape,
  collectHotspots,
  hotspotHints,
  type Locale,
  type RuleMode,
} from '@redflag/shared';

export interface QuizText {
  title?: string;
  prompt: string;
  explanation: string;
  scenario?: string;
  scenarioData: unknown;
}

export interface QuizDraft {
  kind: string;
  isScam: boolean;
  signalCodes: string[];
  categoryCode?: string | null;
  /** Drives the per-level signal/decoy bands in `quizHints` — omit and those checks are skipped. */
  difficultyLevel?: number;
  translations: Partial<Record<Locale, QuizText>>;
}

export interface KnownCodes {
  signals: Set<string>;
  categories: Set<string>;
}

/**
 * Every issue blocking publication (empty = valid).
 * Drafts still save — these are returned as warnings; publishing is blocked.
 */
/** Message language + strictness. Admin UI requests use `basic`; the data CLI (agent-generated content) `full`. */
export interface RuleOpts {
  ui: Locale;
  mode: RuleMode;
}

export const CLI_RULES: RuleOpts = { ui: 'vi', mode: 'full' };

export function quizIssues(
  q: QuizDraft,
  known: KnownCodes,
  opts: RuleOpts = CLI_RULES,
): string[] {
  const { ui, mode } = opts;
  const m = RULE_MSG[ui];
  const issues: string[] = [];
  const unknownSignals = q.signalCodes.filter((c) => !known.signals.has(c));
  if (unknownSignals.length) issues.push(m.unknownSignal(unknownSignals));
  if (q.categoryCode && !known.categories.has(q.categoryCode)) {
    issues.push(m.unknownCategory(q.categoryCode));
  }

  for (const locale of SUPPORTED_LOCALES) {
    const tag = `[${locale.toUpperCase()}]`;
    const t = q.translations[locale];
    if (!t) {
      issues.push(`${tag} ${m.missingTranslation}`);
      continue;
    }
    if (!t.prompt.trim()) issues.push(`${tag} ${m.missingPrompt}`);
    if (!t.explanation.trim()) issues.push(`${tag} ${m.missingExplanation}`);
    for (const e of checkScenarioShape(q.kind, t.scenarioData, ui))
      issues.push(`${tag} ${e}`);
    for (const e of checkQuizHotspots(
      { isScam: q.isScam, signalCodes: q.signalCodes, scenarioData: t.scenarioData },
      ui,
      mode,
    )) {
      issues.push(`${tag} ${e}`);
    }
    const strayHotspots = [...new Set(collectHotspots(t.scenarioData).values())].filter(
      (c) => !known.signals.has(c),
    );
    if (strayHotspots.length) issues.push(`${tag} ${m.strayHotspot(strayHotspots)}`);
  }
  return issues;
}

/**
 * Non-blocking suggestions, per locale. Never blocks publishing — these are the authoring-quality
 * bands from docs/simulation-design.md §1c (how many answer signals and decoys a level wants).
 */
export function quizHints(q: QuizDraft, opts: RuleOpts = CLI_RULES): string[] {
  const hints: string[] = [];
  for (const locale of SUPPORTED_LOCALES) {
    const t = q.translations[locale];
    if (!t) continue;
    for (const h of hotspotHints(
      {
        signalCodes: q.signalCodes,
        scenarioData: t.scenarioData,
        difficultyLevel: q.difficultyLevel,
        isScam: q.isScam,
      },
      opts.ui,
    )) {
      hints.push(`[${locale.toUpperCase()}] ${h}`);
    }
  }
  return hints;
}

/** Flat text (SEO + fallback) built from scenarioData: all text segments joined in order. */
export function scenarioToText(data: unknown): string {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === 'string') {
      if (node.trim()) out.push(node.trim());
    } else if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node && typeof node === 'object') {
      const o = node as Record<string, unknown>;
      if (typeof o.text === 'string') walk(o.text);
      else if (typeof o.name === 'string') walk(o.name);
      else
        Object.entries(o).forEach(([k, v]) => {
          if (k !== 'signal' && k !== 'from') walk(v);
        });
    }
  };
  walk(data);
  return out.join('\n');
}
