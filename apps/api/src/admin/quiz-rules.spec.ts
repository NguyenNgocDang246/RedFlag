import { describe, expect, it } from 'vitest';
import {
  checkQuizHotspots,
  checkScenarioShape,
  collectDecoys,
  hotspotHints,
  normalizeNote,
  parseAdminEmails,
  stripNotes,
} from '@redflag/shared';
import { quizIssues, scenarioToText, type QuizDraft } from './quiz-rules';

/** A valid note: long enough and unique per key. */
const N = (k: string) =>
  `Giải thích riêng cho ${k}: đủ dài để vượt ngưỡng tối thiểu của luật.`;

const sms = (spots: [string, string][], plain: string[] = []) => ({
  sender: 'TelNet',
  messages: [
    ...spots.map(([text, signal]) => ({ text, signal, note: N(text) })),
    ...plain,
  ],
});

describe('checkQuizHotspots', () => {
  const decoy = (text: string, signal: string, note = N(text)) => ({
    text,
    signal,
    note,
  });

  it('chấp nhận bài lừa có mồi kèm giải thích', () => {
    const data = {
      sender: decoy('TelNet', 'SENDER_MISMATCH'),
      messages: [{ text: 'khoá trong 24h', signal: 'URGENCY', note: N('k0') }],
    };
    expect(
      checkQuizHotspots({ isScam: true, signalCodes: ['URGENCY'], scenarioData: data }),
    ).toEqual([]);
  });

  it('bài lừa không có mồi bị chặn (chỉ hotspot mới chạm được)', () => {
    const data = sms([['khoá trong 24h', 'URGENCY']]);
    expect(
      checkQuizHotspots({
        isScam: true,
        signalCodes: ['URGENCY'],
        scenarioData: data,
      }).join(),
    ).toMatch(/ít nhất 1 hotspot mồi/);
  });

  it('bài an toàn không cần mồi: không có hotspot nào vẫn hợp lệ, có mồi cũng hợp lệ', () => {
    expect(
      checkQuizHotspots({ isScam: false, signalCodes: [], scenarioData: sms([]) }),
    ).toEqual([]);
    expect(
      checkQuizHotspots({
        isScam: false,
        signalCodes: [],
        scenarioData: sms([['x', 'SENDER_MISMATCH']]),
      }),
    ).toEqual([]);
  });

  it('báo lỗi khi giải thích quá ngắn', () => {
    const data = {
      sender: decoy('TelNet', 'SENDER_MISMATCH', 'bình thường'),
      messages: [{ text: 'gấp', signal: 'URGENCY', note: N('gấp') }],
    };
    expect(
      checkQuizHotspots({
        isScam: true,
        signalCodes: ['URGENCY'],
        scenarioData: data,
      }).join(),
    ).toMatch(/quá ngắn.*bình thường/);
  });

  it('báo lỗi khi hai hotspot trong bài trùng nguyên văn giải thích', () => {
    const same = N('giống nhau');
    const data = {
      sender: decoy('TelNet', 'SENDER_MISMATCH', same),
      messages: [{ text: 'gấp', signal: 'URGENCY', note: ' ' + same.toUpperCase() }],
    };
    expect(
      checkQuizHotspots({
        isScam: true,
        signalCodes: ['URGENCY'],
        scenarioData: data,
      }).join(),
    ).toMatch(/bị trùng nguyên văn/);
  });

  it('báo lỗi khi mồi thiếu giải thích (kể cả tệp đính kèm)', () => {
    const data = {
      sender: 'TelNet',
      messages: [
        { text: 'khoá trong 24h', signal: 'URGENCY', note: N('k1') },
        { text: 'Từ chối nhận tin', signal: 'MISSING_DETAILS' },
      ],
      attachments: [{ name: 'a.pdf', signal: 'SUSPICIOUS_ATTACHMENT', note: '  ' }],
    };
    const errors = checkQuizHotspots({
      isScam: true,
      signalCodes: ['URGENCY'],
      scenarioData: data,
    });
    expect(errors.join()).toMatch(/thiếu giải thích.*"Từ chối nhận tin".*"a.pdf"/);
  });

  it('báo lỗi khi hotspot đúng thiếu giải thích', () => {
    const data = {
      sender: 'TelNet',
      messages: [{ text: 'khoá trong 24h', signal: 'URGENCY' }],
    };
    const errors = checkQuizHotspots({
      isScam: true,
      signalCodes: ['URGENCY'],
      scenarioData: data,
    });
    expect(errors.join()).toMatch(/hotspot đúng thiếu giải thích.*"khoá trong 24h"/);
  });

  it('báo lỗi khi signal đáp án không có hotspot', () => {
    const data = {
      sender: 'TelNet',
      messages: [
        { text: 'khoá trong 24h', signal: 'URGENCY' },
        decoy('x', 'OFF_CHANNEL'),
      ],
    };
    const errors = checkQuizHotspots({
      isScam: true,
      signalCodes: ['URGENCY', 'TOO_GOOD'],
      scenarioData: data,
    });
    expect(errors.join()).toMatch(/không có hotspot: TOO_GOOD/);
  });

  it('bài lừa phải có signal đáp án', () => {
    expect(
      checkQuizHotspots({ isScam: true, signalCodes: [], scenarioData: sms([]) }).join(),
    ).toMatch(/ít nhất 1 signal/);
  });
});

describe('hotspotHints', () => {
  it('gợi ý chèn mồi khi chưa có', () => {
    expect(
      hotspotHints({
        signalCodes: ['URGENCY'],
        scenarioData: sms([['gấp', 'URGENCY']]),
      }).join(),
    ).toMatch(/chưa có hotspot mồi/);
  });

  it('không gợi ý khi đã có mồi', () => {
    const data = {
      sender: { text: 'TelNet', signal: 'SENDER_MISMATCH', note: N('k2') },
      messages: [{ text: 'gấp', signal: 'URGENCY', note: N('k3') }],
    };
    expect(hotspotHints({ signalCodes: ['URGENCY'], scenarioData: data })).toEqual([]);
  });
});

describe('stripNotes / collectDecoys', () => {
  const data = {
    sender: { text: 'TelNet', signal: 'SENDER_MISMATCH', note: N('brandname') },
    messages: [{ text: 'gấp', signal: 'URGENCY' }],
    attachments: [{ name: 'a.pdf', signal: 'SUSPICIOUS_ATTACHMENT', note: N('pdf') }],
  };

  it('bỏ note trước khi phục vụ bài', () => {
    expect(JSON.stringify(stripNotes(data))).not.toMatch(/note/);
    expect(data.sender.note).toBe(N('brandname')); // không đổi dữ liệu gốc
  });

  it('lấy note của mồi, bỏ qua hotspot đúng', () => {
    expect(collectDecoys(data, ['URGENCY'])).toEqual([
      { signal: 'SENDER_MISMATCH', text: 'TelNet', note: N('brandname') },
      { signal: 'SUSPICIOUS_ATTACHMENT', text: 'a.pdf', note: N('pdf') },
    ]);
  });
});

describe('checkScenarioShape', () => {
  it('bắt thiếu field bắt buộc của email', () => {
    const errors = checkScenarioShape('email_inspection', {
      senderName: 'Bank',
      body: [],
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        'thiếu "senderAddress"',
        'thiếu "subject"',
        '"body" cần ít nhất 1 dòng',
      ]),
    );
  });

  it('kiểm "from" của chat', () => {
    const errors = checkScenarioShape('chat_inspection', {
      contactName: 'Lan',
      bubbles: [{ from: 'x', text: 'hi' }],
    });
    expect(errors.join()).toMatch(/them\/me/);
  });

  it('popup chưa có vỏ', () => {
    expect(checkScenarioShape('popup', {})).toHaveLength(1);
  });

  it('SMS hợp lệ', () => {
    expect(checkScenarioShape('sms_inspection', sms([['a', 'URGENCY']]))).toEqual([]);
  });
});

describe('quizIssues', () => {
  const known = {
    signals: new Set(['URGENCY', 'TOO_GOOD']),
    categories: new Set(['BANK']),
  };
  const text = (scenarioData: unknown) => ({
    prompt: 'P',
    explanation: 'E',
    scenarioData,
  });
  const valid = {
    sender: 'TelNet',
    messages: [
      { text: 'gấp', signal: 'URGENCY', note: N('k4') },
      { text: 'quà', signal: 'TOO_GOOD', note: N('quà') },
    ],
  };

  it('bài đủ EN/VI hợp lệ không có vấn đề', () => {
    const q: QuizDraft = {
      kind: 'sms_inspection',
      isScam: true,
      signalCodes: ['URGENCY'],
      categoryCode: 'BANK',
      translations: { en: text(valid), vi: text(valid) },
    };
    expect(quizIssues(q, known)).toEqual([]);
  });

  it('báo thiếu bản dịch, code lạ và hotspot gắn signal lạ', () => {
    const q: QuizDraft = {
      kind: 'sms_inspection',
      isScam: true,
      signalCodes: ['URGENCY', 'NOPE'],
      categoryCode: 'XYZ',
      translations: {
        en: text(
          sms([
            ['gấp', 'URGENCY'],
            ['?', 'GHOST'],
          ]),
        ),
      },
    };
    const issues = quizIssues(q, known).join('\n');
    expect(issues).toMatch(/signal không tồn tại: NOPE/);
    expect(issues).toMatch(/category không tồn tại: XYZ/);
    expect(issues).toMatch(/\[VI\] thiếu bản dịch/);
    expect(issues).toMatch(/\[EN\] hotspot gắn signal không tồn tại: GHOST/);
  });
});

describe('scenarioToText', () => {
  it('nối chữ theo thứ tự, bỏ signal/from', () => {
    const t = scenarioToText({
      contactName: { text: 'Lan', signal: 'X' },
      bubbles: [{ from: 'them', text: 'Chào' }],
    });
    expect(t).toBe('Lan\nChào');
  });
});

describe('parseAdminEmails', () => {
  it('tách dấu phẩy, bỏ khoảng trắng, về chữ thường', () => {
    expect(parseAdminEmails(' A@x.com , ,b@Y.com')).toEqual(['a@x.com', 'b@y.com']);
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails('')).toEqual([]);
  });
});

describe('rule messages per UI language', () => {
  it('returns English messages when asked, Vietnamese by default', () => {
    expect(checkScenarioShape('sms_inspection', { messages: [] }, 'en')).toEqual([
      'missing "sender"',
      '"messages" needs at least 1 line(s)',
    ]);
    expect(checkScenarioShape('sms_inspection', { messages: [] })).toEqual([
      'thiếu "sender"',
      '"messages" cần ít nhất 1 dòng',
    ]);
    expect(
      checkQuizHotspots({ isScam: true, signalCodes: [], scenarioData: sms([]) }, 'en'),
    ).toContain('a scam quiz needs at least 1 answer signal');
  });

  it('localizes quizIssues tags and codes', () => {
    const q: QuizDraft = {
      kind: 'sms_inspection',
      isScam: false,
      signalCodes: ['NOPE'],
      translations: {},
    };
    const issues = quizIssues(
      q,
      { signals: new Set(), categories: new Set() },
      { ui: 'en', mode: 'full' },
    ).join('\n');
    expect(issues).toMatch(/unknown signal: NOPE/);
    expect(issues).toMatch(/\[EN\] missing translation/);
  });
});

describe('normalizeNote', () => {
  it('collapses whitespace and keeps letters (regression: /s+/ used to eat the letter "s")', () => {
    expect(normalizeNote('  Sms   is\tSafe ')).toBe('sms is safe');
  });
});

describe('rule modes', () => {
  it('basic (admin UI) keeps what a quiz needs, drops authoring-quality rules (data CLI)', () => {
    // Answer hotspot without a note: fails the quality rules, still a working quiz.
    const data = { messages: [{ text: 'khoá trong 24h', signal: 'URGENCY' }] };
    const full = checkQuizHotspots({
      isScam: true,
      signalCodes: ['URGENCY'],
      scenarioData: data,
    });
    expect(full.length).toBeGreaterThan(0);
    expect(
      checkQuizHotspots(
        { isScam: true, signalCodes: ['URGENCY'], scenarioData: data },
        'vi',
        'basic',
      ),
    ).toEqual([]);
    // A missing answer hotspot breaks grading → still reported in basic mode.
    expect(
      checkQuizHotspots(
        { isScam: true, signalCodes: ['URGENCY', 'FAKE_DOMAIN'], scenarioData: data },
        'en',
        'basic',
      ),
    ).toEqual(['answer signal has no hotspot: FAKE_DOMAIN']);
  });
});
