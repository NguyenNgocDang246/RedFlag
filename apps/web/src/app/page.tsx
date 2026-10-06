export default function HomePage() {
  return (
    <main>
      <h1 style={{ color: 'var(--accent)' }}>PhishGym</h1>
      <p>Sân tập rèn phản xạ nhận biết lừa đảo online.</p>
      <p style={{ opacity: 0.7 }}>
        Phase 0 — nền tảng đã dựng xong. Các màn hình học &amp; test sẽ xuất hiện ở
        các phase tiếp theo.
      </p>
      <p>
        <a href="/api/health" style={{ color: 'var(--accent)' }}>
          Kiểm tra tình trạng hệ thống →
        </a>
      </p>
    </main>
  );
}
