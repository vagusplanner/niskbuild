import { isSuperEduc8Request } from '@/lib/supereduc8-request';
import ResetPasswordClient from './ResetPasswordClient';

export default async function ResetPasswordPage() {
  const brand = (await isSuperEduc8Request()) ? 'supereduc8' : 'niskbuild';
  return <ResetPasswordClient brand={brand} />;
}
