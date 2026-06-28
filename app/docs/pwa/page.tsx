import { redirect } from 'next/navigation';

/** Legacy URL — PWA guide lives in the docs hub (auth required). */
export default function PwaDocsRedirectPage() {
  redirect('/docs/progressive-web-apps-pwa');
}
