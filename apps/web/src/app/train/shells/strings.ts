import type { Locale } from '@/lib/api';

/** In-shell "app UI" text — follows the user's language, like a localized real app. */
export const SKIN_T = {
  en: {
    // Mail
    mail: 'Mail',
    searchMail: 'Search mail',
    inbox: 'Inbox',
    to: 'to',
    reply: 'Reply',
    forward: 'Forward',
    attachments: (n: number) => (n === 1 ? 'One attachment' : `${n} attachments`),
    // Messages (iOS)
    textMessage: 'Text Message',
    today: 'Today',
    // Chat
    message: 'Message',
    online: 'online',
    todayCaps: 'TODAY',
    // Consent — [before, after] the app name
    signInWith: 'Sign in with your account',
    wantsAccess: ['', ' wants to access your account'],
    willAllow: ['This will allow ', ' to:'],
    trust: ['Make sure you trust ', ''],
    trustNote: 'You may be sharing sensitive info with this app. You can always see or remove access in your account settings.',
    cancel: 'Cancel',
    allow: 'Allow',
    // Word
    wordTabs: ['File', 'Home', 'Insert', 'Layout', 'References', 'Review', 'View'],
    securityWarning: 'SECURITY WARNING',
    macrosDisabled: 'Macros have been disabled.',
    enableContent: 'Enable Content',
    // QR camera
    websiteQr: 'Website QR Code',
    photo: 'PHOTO',
    video: 'VIDEO',
    // Android installer
    installAsk: 'Do you want to install this application? It will get access to:',
    installCancel: 'CANCEL',
    install: 'INSTALL',
  },
  vi: {
    mail: 'Mail',
    searchMail: 'Tìm kiếm thư',
    inbox: 'Hộp thư đến',
    to: 'tới',
    reply: 'Trả lời',
    forward: 'Chuyển tiếp',
    attachments: (n: number) => (n === 1 ? 'Một tệp đính kèm' : `${n} tệp đính kèm`),
    textMessage: 'Tin nhắn văn bản',
    today: 'Hôm nay',
    message: 'Tin nhắn',
    online: 'đang hoạt động',
    todayCaps: 'HÔM NAY',
    signInWith: 'Đăng nhập bằng tài khoản của bạn',
    wantsAccess: ['', ' muốn truy cập vào tài khoản của bạn'],
    willAllow: ['Thao tác này sẽ cho phép ', ':'],
    trust: ['Hãy đảm bảo rằng bạn tin tưởng ', ''],
    trustNote: 'Bạn có thể đang chia sẻ thông tin nhạy cảm với ứng dụng này. Bạn luôn có thể xem hoặc xoá quyền truy cập trong phần cài đặt tài khoản.',
    cancel: 'Huỷ',
    allow: 'Cho phép',
    wordTabs: ['Tệp', 'Trang đầu', 'Chèn', 'Bố trí', 'Tham chiếu', 'Xem lại', 'Dạng xem'],
    securityWarning: 'CẢNH BÁO BẢO MẬT',
    macrosDisabled: 'Macro đã bị vô hiệu hoá.',
    enableContent: 'Bật Nội dung',
    websiteQr: 'Mã QR trang web',
    photo: 'ẢNH',
    video: 'VIDEO',
    installAsk: 'Bạn có muốn cài đặt ứng dụng này không? Ứng dụng sẽ có quyền truy cập vào:',
    installCancel: 'HUỶ',
    install: 'CÀI ĐẶT',
  },
} satisfies Record<Locale, unknown>;
