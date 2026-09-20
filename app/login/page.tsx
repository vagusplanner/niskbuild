import { isSuperEduc8Request } from '@/lib/supereduc8-request';
import LoginClient from './LoginClient';

export default async function LoginPage() {
  const brand = (await isSuperEduc8Request()) ? 'supereduc8' : 'niskbuild';
  return <LoginClient brand={brand} />;
}
