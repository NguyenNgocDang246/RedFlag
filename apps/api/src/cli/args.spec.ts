import { describe, expect, it } from 'vitest';
import { flagString, parseArgs, parseQuizRef } from './args';

describe('parseArgs', () => {
  it('splits positional args and valued flags', () => {
    const r = parseArgs(['quiz', 'update', '#54', '--file', 'q.json']);
    expect(r.positional).toEqual(['quiz', 'update', '#54']);
    expect(r.flags).toEqual({ file: 'q.json' });
  });

  it('supports --key=value', () => {
    expect(parseArgs(['brand', 'list', '--locale=vi']).flags).toEqual({ locale: 'vi' });
  });

  it('boolean flags never swallow the next argument', () => {
    const r = parseArgs(['quiz', 'delete', '--yes', '#12']);
    expect(r.flags).toEqual({ yes: true });
    expect(r.positional).toEqual(['quiz', 'delete', '#12']);
  });

  it('a trailing flag or one followed by another flag is boolean', () => {
    expect(parseArgs(['quiz', 'create', '--file', 'a.json', '--dry-run']).flags).toEqual({
      file: 'a.json',
      'dry-run': true,
    });
    expect(parseArgs(['quiz', 'list', '--status', '--q', 'bank']).flags).toEqual({ status: true, q: 'bank' });
  });

  it('flagString ignores boolean flags', () => {
    const { flags } = parseArgs(['--file', '--yes']);
    expect(flagString(flags, 'file')).toBeUndefined();
  });
});

describe('parseQuizRef', () => {
  it('reads #number, plain number and id', () => {
    expect(parseQuizRef('#54')).toEqual({ number: 54 });
    expect(parseQuizRef('7')).toEqual({ number: 7 });
    expect(parseQuizRef('cmuydtnt6008kvkk0t99ogev5')).toEqual({ id: 'cmuydtnt6008kvkk0t99ogev5' });
  });
});
