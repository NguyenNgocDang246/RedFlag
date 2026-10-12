/** Flags that take no value — so `--yes foo` doesn't swallow `foo` as the flag's value. */
const BOOLEAN_FLAGS = new Set(['dry-run', 'yes', 'help']);

export interface ParsedArgs {
  /** Positional args: entity, action, code/id… */
  positional: string[];
  flags: Record<string, string | true>;
}

/**
 * Parses argv like `quiz update #54 --file q.json --dry-run`.
 * Supports `--key value`, `--key=value` and boolean flags (`--yes`, `--dry-run`).
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      positional.push(a);
      continue;
    }
    const body = a.slice(2);
    const eq = body.indexOf('=');
    if (eq >= 0) {
      flags[body.slice(0, eq)] = body.slice(eq + 1);
    } else if (BOOLEAN_FLAGS.has(body) || i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
      flags[body] = true;
    } else {
      flags[body] = argv[++i];
    }
  }
  return { positional, flags };
}

/** String value of a flag (boolean flags are ignored). */
export function flagString(flags: ParsedArgs['flags'], name: string): string | undefined {
  const v = flags[name];
  return typeof v === 'string' && v !== '' ? v : undefined;
}

/** `#54` or `54` → sequence number; anything else is an id. */
export function parseQuizRef(ref: string): { number: number } | { id: string } {
  return /^#?\d+$/.test(ref) ? { number: Number.parseInt(ref.replace('#', ''), 10) } : { id: ref };
}
