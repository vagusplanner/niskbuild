import HelpAssistant from '@/app/components/HelpAssistant';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <HelpAssistant mode="admin" bottomOffset={56} />
    </>
  );
}
