import { redirect } from 'next/navigation';

/** Legacy URL — Google import guide lives in the docs hub (auth required). */
export default function GoogleImportDocsRedirectPage() {
  redirect('/docs/importing-from-base44');
}
