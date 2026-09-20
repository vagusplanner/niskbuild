import type { ReactNode } from 'react';
import AppTopNav from '@/app/components/AppTopNav';
import SuperEduc8Logo from '@/app/components/SuperEduc8Logo';
import type { AuthProductBrand } from '@/app/components/auth/auth-brand';
import './auth-brand.css';

export default function AuthProductShell({
  brand,
  children,
}: {
  brand: AuthProductBrand;
  children: ReactNode;
}) {
  if (brand === 'supereduc8') {
    return (
      <div className="supereduc8-auth min-h-screen flex flex-col">
        <header className="supereduc8-auth-header">
          <SuperEduc8Logo href="/" variant="lockup" size="sm" />
        </header>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nisk flex flex-col">
      <AppTopNav variant="marketing" />
      {children}
    </div>
  );
}
