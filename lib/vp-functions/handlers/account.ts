import { callInternalApi } from '../internal-fetch';
import type { VpFunctionHandler } from '../types';

export const deleteUserAccount: VpFunctionHandler = async ({ request, user }) => {
  const email = user.email;
  if (!email) {
    return { ok: false, error: 'Account email is required', status: 400 };
  }

  const { ok, json } = await callInternalApi(request, '/api/account/delete', { email });

  if (!ok) {
    const error = typeof json.error === 'string' ? json.error : 'Failed to delete account';
    return { ok: false, error, status: 400 };
  }

  return {
    ok: true,
    data: {
      success: json.success === true,
      partial: json.partial === true,
      message: typeof json.message === 'string' ? json.message : undefined,
    },
  };
};
