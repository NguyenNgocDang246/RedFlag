import { describe, expect, it } from 'vitest';
import type { SaveTestEmailDto } from './dto/test-email.dto';
import { testEmailIssues } from './test-email-rules';

const good = (): SaveTestEmailDto => ({
  code: 'BANK-002',
  categoryCode: 'BANK',
  titles: { en: 'Bank: card blocked', vi: '' },
  variants: [
    {
      difficultyLevel: 1,
      signalCodes: ['URGENCY'],
      translations: {
        en: { senderName: 'Bank', subject: 'Card blocked', body: 'Hi {{name}},\n\n[[Unblock now]]' },
        vi: { senderName: '', subject: '', body: '' },
      },
    },
  ],
});

describe('testEmailIssues', () => {
  it('accepts a complete email written in one language', () => {
    expect(testEmailIssues(good(), 'en')).toEqual([]);
  });

  it('needs a name, a language, red flags and a link', () => {
    const dto = good();
    dto.titles = { en: ' ', vi: '' };
    dto.variants[0].signalCodes = [];
    dto.variants[0].translations.en!.body = 'No link here';
    expect(testEmailIssues(dto, 'en')).toEqual([
      'The template has no name',
      'Email 1: no red flags picked',
      'Email 1 (EN): the body needs one link written as [[link text]]',
    ]);
  });

  it('flags a half-written language and a second link', () => {
    const dto = good();
    dto.variants[0].translations.vi = { senderName: 'Ngân hàng', subject: '', body: '[[a]] [[b]]' };
    expect(testEmailIssues(dto, 'vi')).toEqual([
      'Email 1 (VI): thiếu tiêu đề',
      'Email 1 (VI): chỉ được có một link [[…]], đang có 2',
    ]);
  });

  it('flags an email with nothing written', () => {
    const dto = good();
    dto.variants[0].translations = {};
    expect(testEmailIssues(dto, 'en')).toEqual(['Email 1: not written in any language']);
  });
});
