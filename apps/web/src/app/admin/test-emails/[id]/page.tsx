import { TestEmailEditor } from '../editor/test-email-editor';

export default async function EditTestEmailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TestEmailEditor key={id} id={id} />;
}
