import type { VpFunctionHandler } from '../types';

export const notImplementedHandler: VpFunctionHandler = async () => ({
  ok: false,
  error: 'Not implemented',
  status: 501,
});
