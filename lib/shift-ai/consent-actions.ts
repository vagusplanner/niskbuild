'use server';

import 'server-only';

import { randomBytes } from 'node:crypto';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getConsentRequestByToken,
  isConsentRequestValid,
} from '@/lib/shift-ai/consent-auth';
import {
  sendParentDeclineConfirmationEmail,
  sendParentWelcomeAfterConsentEmail,
} from '@/lib/shift-ai/emails';
import { normalizeEmail } from '@/lib/shift-ai/constants';
import { withLangQuery } from '@/lib/shift-ai/locale-query';
import { getStudentLanguage } from '@/lib/shift-ai/study-language';

function generateTemporaryPassword(): string {
  return randomBytes(9).toString('base64url').slice(0, 12);
}

function generateStudentLoginEmail(studentId: string): string {
  const slug = studentId.replace(/-/g, '').slice(0, 12);
  return `shift.${slug}@students.niskbuild.com`;
}

async function upsertVerifiedParentAccount(admin: ReturnType<typeof createAdminClient>, email: string) {
  const normalized = normalizeEmail(email);
  const now = new Date().toISOString();

  const { data: existing } = await admin
    .schema('firstparty')
    .from('shift_parent_accounts')
    .select('id')
    .eq('parent_email', normalized)
    .maybeSingle();

  if (existing?.id) {
    await admin
      .schema('firstparty')
      .from('shift_parent_accounts')
      .update({ verified: true, verified_at: now })
      .eq('id', existing.id);
    return;
  }

  await admin.schema('firstparty').from('shift_parent_accounts').insert({
    parent_email: normalized,
    verified: true,
    verified_at: now,
  });
}

function consentResultPath(token: string, query: string, lang?: string | null) {
  return withLangQuery(`/builder/shift-ai/parent/consent/${token}?${query}`, lang);
}

function consentInvalidPath(lang?: string | null) {
  return withLangQuery('/builder/shift-ai/parent/consent/invalid', lang);
}

export async function approveParentConsent(token: string, lang?: string | null) {
  const request = await getConsentRequestByToken(token);

  if (!request || !isConsentRequestValid(request)) {
    redirect(consentInvalidPath(lang));
  }

  const admin = createAdminClient();
  const tempPassword = generateTemporaryPassword();
  const loginEmail = generateStudentLoginEmail(request.studentId);

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: loginEmail,
    password: tempPassword,
    email_confirm: true,
  });

  if (authError || !authUser.user) {
    console.error('Shift AI createUser failed:', authError?.message);
    redirect(consentResultPath(token, 'error=activate', lang));
  }

  const now = new Date().toISOString();

  const { error: studentError } = await admin
    .schema('firstparty')
    .from('shift_students')
    .update({
      user_id: authUser.user.id,
      login_email: loginEmail,
      is_active: true,
      parent_consent_given: true,
      parent_consent_given_at: now,
    })
    .eq('id', request.studentId);

  if (studentError) {
    console.error('Shift AI student activate failed:', studentError.message);
    await admin.auth.admin.deleteUser(authUser.user.id);
    redirect(consentResultPath(token, 'error=activate', lang));
  }

  await admin
    .schema('firstparty')
    .from('shift_parent_consent_requests')
    .update({ status: 'approved', responded_at: now })
    .eq('id', request.id);

  await upsertVerifiedParentAccount(admin, request.parentEmail);

  const { data: parentTokenRow } = await admin
    .schema('firstparty')
    .from('shift_parent_tokens')
    .insert({ student_id: request.studentId })
    .select('token')
    .single();

  const parentDashboardToken = parentTokenRow?.token;
  if (!parentDashboardToken) {
    redirect(consentResultPath(token, 'error=token', lang));
  }

  await sendParentWelcomeAfterConsentEmail({
    parentEmail: request.parentEmail,
    childFirstName: request.childFirstName,
    childLoginEmail: loginEmail,
    temporaryPassword: tempPassword,
    parentDashboardToken,
    studyLanguage: await getStudentLanguage(request.studentId),
  });

  redirect(consentResultPath(token, 'status=approved', lang));
}

export async function declineParentConsent(token: string, lang?: string | null) {
  const request = await getConsentRequestByToken(token);

  if (!request || !isConsentRequestValid(request)) {
    redirect(consentInvalidPath(lang));
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  await admin
    .schema('firstparty')
    .from('shift_parent_consent_requests')
    .update({ status: 'declined', responded_at: now })
    .eq('id', request.id);

  await admin
    .schema('firstparty')
    .from('shift_students')
    .update({ is_active: false, parent_consent_given: false })
    .eq('id', request.studentId);

  await sendParentDeclineConfirmationEmail({
    parentEmail: request.parentEmail,
    childFirstName: request.childFirstName,
  });

  redirect(consentResultPath(token, 'status=declined', lang));
}
