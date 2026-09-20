import { isSuperEduc8Request } from '@/lib/supereduc8-request';
import VerifyPhoneClient from './VerifyPhoneClient';

export default async function VerifyPhonePage() {
  const brand = (await isSuperEduc8Request()) ? 'supereduc8' : 'niskbuild';
  return <VerifyPhoneClient brand={brand} />;
}
