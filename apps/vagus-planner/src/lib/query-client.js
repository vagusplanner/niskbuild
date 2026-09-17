import { QueryClient } from '@tanstack/react-query';
import { installVpQueryInvalidation } from '@/lib/vp-query-keys';

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});

installVpQueryInvalidation(queryClientInstance);
