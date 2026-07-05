import { callInternalApi } from '../internal-fetch';
import type { VpFunctionHandler } from '../types';

const TOPIC_TO_CATEGORY: Record<string, string> = {
  'General Enquiry': 'general',
  'Billing & Subscription': 'billing',
  'Privacy / Data Request': 'general',
  'Technical Support': 'technical',
  'Bug Report': 'bug',
  'Feature Request': 'feature',
  Partnership: 'sales',
  Other: 'general',
};

export const sendContactForm: VpFunctionHandler = async ({ request, payload }) => {
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const topic = typeof payload.topic === 'string' ? payload.topic.trim() : '';
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';

  const { ok, json } = await callInternalApi(request, '/api/support/contact', {
    name,
    email,
    subject: topic || 'Contact form',
    message,
    category: TOPIC_TO_CATEGORY[topic] ?? 'general',
  });

  if (!ok) {
    const error = typeof json.error === 'string' ? json.error : 'Failed to send message';
    return { ok: false, error, status: 400 };
  }

  return {
    ok: true,
    data: {
      success: true,
      ticketId: json.ticketId,
      message: json.message ?? 'Thanks — we received your message.',
    },
  };
};
