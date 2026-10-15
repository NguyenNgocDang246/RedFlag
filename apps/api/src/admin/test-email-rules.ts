import type { SaveTestEmailDto, VariantTextDto } from './dto/test-email.dto';

type Ui = 'en' | 'vi';
const LOCALES = ['en', 'vi'] as const;

/** Every [[link]] in a body. The renderer only turns the first one in a paragraph into a link. */
const LINKS = /\[\[[^\]]+\]\]/g;

const isBlank = (t?: VariantTextDto) =>
  !t || (!t.senderName.trim() && !t.subject.trim() && !t.body.trim());

/**
 * What stops a test email from being published. A draft may be saved with issues; publishing (or
 * saving a published one) is refused until the list is empty.
 */
export function testEmailIssues(dto: SaveTestEmailDto, ui: Ui): string[] {
  const vi = ui === 'vi';
  const issues: string[] = [];

  if (!dto.titles.en?.trim() && !dto.titles.vi?.trim()) {
    issues.push(vi ? 'Chưa có tên mẫu' : 'The template has no name');
  }

  dto.variants.forEach((v, i) => {
    const n = i + 1;
    const written = LOCALES.filter((l) => !isBlank(v.translations[l]));
    if (written.length === 0) {
      issues.push(vi ? `Email ${n}: chưa viết ngôn ngữ nào` : `Email ${n}: not written in any language`);
    }
    if (v.signalCodes.length === 0) {
      issues.push(vi ? `Email ${n}: chưa chọn dấu hiệu nào` : `Email ${n}: no red flags picked`);
    }
    for (const l of written) {
      const t = v.translations[l]!;
      const where = `Email ${n} (${l.toUpperCase()})`;
      if (!t.senderName.trim()) issues.push(vi ? `${where}: thiếu tên người gửi` : `${where}: no sender name`);
      if (!t.subject.trim()) issues.push(vi ? `${where}: thiếu tiêu đề` : `${where}: no subject`);
      if (!t.body.trim()) {
        issues.push(vi ? `${where}: thiếu nội dung` : `${where}: no body`);
        continue;
      }
      const links = t.body.match(LINKS) ?? [];
      if (links.length === 0) {
        issues.push(
          vi
            ? `${where}: nội dung cần đúng một link dạng [[chữ hiện ra]]`
            : `${where}: the body needs one link written as [[link text]]`,
        );
      } else if (links.length > 1) {
        issues.push(
          vi
            ? `${where}: chỉ được có một link [[…]], đang có ${links.length}`
            : `${where}: only one [[…]] link is allowed, found ${links.length}`,
        );
      }
    }
  });

  return issues;
}
