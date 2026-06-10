import { redirect } from 'next/navigation';

/** Sign-up lives on /login — keep /signup for bookmarks and external links */
export default function SignupPage() {
  redirect('/login');
}
