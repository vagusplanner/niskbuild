import { callInternalApi } from '../internal-fetch';
import type { VpFunctionHandler } from '../types';

export const deleteUserAccount: VpFunctionHandler = async ({ request, user }) => {
  const email = user.email;
  if (!email) {
    return { ok: false, error: 'Account email is required', status: 400 };
  }

  const { ok, status, json } = await callInternalApi(request, '/api/account/delete', { email });

  if (!ok || json.partial === true || json.success !== true) {
    const error =
      (typeof json.error === 'string' && json.error) ||
      (typeof json.message === 'string' && json.message) ||
      'Failed to delete account';
    return { ok: false, error, status: status >= 400 ? status : 502 };
  }

  return {
    ok: true,
    data: {
      success: true,
    },
  };
};
