type ApiErrorPayload = {
  detail?: unknown;
  message?: unknown;
};

type ApiErrorLike = {
  message?: unknown;
  response?: {
    data?: ApiErrorPayload;
  };
};

export function getErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;

  const apiError = error as ApiErrorLike;
  const detail = apiError.response?.data?.detail;
  const message = apiError.response?.data?.message;

  if (typeof detail === 'string' && detail.trim()) return detail;
  if (typeof message === 'string' && message.trim()) return message;
  if (typeof apiError.message === 'string' && apiError.message.trim()) return apiError.message;

  return fallback;
}
