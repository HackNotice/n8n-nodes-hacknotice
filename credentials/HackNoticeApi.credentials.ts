import type {
	IAuthenticate,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

const AUTH_SIGN_IN_PATH = '/auth/sign_in';
const LOG_PREFIX = '[HackNotice credential]';

export class HackNoticeApi implements ICredentialType {
	name = 'hackNoticeApi';

	displayName = 'HackNotice API';

	icon: Icon = { light: 'file:../icons/github.svg', dark: 'file:../icons/github.dark.svg' };

	documentationUrl = 'https://documenter.getpostman.com/view/806684/RWaHzA6C';

	properties: INodeProperties[] = [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{ name: 'API Key', value: 'apiKey' },
				{ name: 'Email & Password', value: 'emailPassword' },
			],
			default: 'apiKey',
		},
		// API Key
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			displayOptions: { show: { authentication: ['apiKey'] } },
		},
		// Email & Password
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			placeholder: 'name@example.com',
			default: '',
			displayOptions: { show: { authentication: ['emailPassword'] } },
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			displayOptions: { show: { authentication: ['emailPassword'] } },
		},
		// Shared
		{
			displayName: 'API Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.hacknotice.com',
			placeholder: 'https://api.hacknotice.com',
			description: 'Base URL of the HackNotice API (used for sign-in and API requests).',
		},
	];

	authenticate: IAuthenticate = async (credentials, requestOptions) => {
		const auth = credentials.authentication as string | undefined;
		const baseUrl = ((credentials.baseUrl as string) || 'https://api.hacknotice.com').replace(/\/$/, '');

		// Log non-sensitive info for debugging (no passwords, tokens, or API keys)
		console.log(LOG_PREFIX, 'authenticate called', {
			authMethod: auth,
			baseUrl,
			requestOptionsKeys: requestOptions ? Object.keys(requestOptions) : [],
			...(requestOptions?.url !== undefined && { requestUrl: requestOptions.url }),
			...(requestOptions?.baseURL !== undefined && { requestBaseURL: requestOptions.baseURL }),
		});

		const buildAndLogFinalOptions = (headers: Record<string, string>) => {
			const finalOptions = {
				...requestOptions,
				headers: {
					...requestOptions.headers,
					...headers,
				},
			};

			// Prepare safe-to-log headers (no secrets)
			const safeHeaders: Record<string, string> = { ...(finalOptions.headers as Record<string, string>) };
			if (safeHeaders.Authorization) safeHeaders.Authorization = '***redacted***';
			if (safeHeaders.authorization) safeHeaders.authorization = '***redacted***';

			// Prepare safe body preview
			let bodyPreview: string | undefined;
			let bodyType: string | undefined;
			if (finalOptions.body !== undefined) {
				bodyType = typeof finalOptions.body;
				try {
					if (typeof finalOptions.body === 'string') {
						bodyPreview = finalOptions.body.slice(0, 500);
					} else if (Buffer.isBuffer(finalOptions.body)) {
						bodyPreview = finalOptions.body.toString('utf8', 0, 500);
					} else {
						bodyPreview = JSON.stringify(finalOptions.body).slice(0, 500);
					}
				} catch {
					bodyPreview = '[unserializable body]';
				}
			}

			const fullUrl =
				(typeof finalOptions.baseURL === 'string' ? finalOptions.baseURL.replace(/\/$/, '') : baseUrl) +
				(typeof finalOptions.url === 'string' ? finalOptions.url : '');

			console.log(LOG_PREFIX, 'outgoing request', {
				method: finalOptions.method ?? 'GET',
				baseURL: finalOptions.baseURL ?? baseUrl,
				url: finalOptions.url,
				fullUrl,
				headers: safeHeaders,
				...(bodyPreview !== undefined && { bodyPreview, bodyType }),
			});

			return finalOptions;
		};

		if (auth === 'emailPassword') {
			const email = credentials.email as string;
			const password = credentials.password as string;
			if (!baseUrl || !email || !password) {
				throw new Error('Email, Password, and API Base URL are required for Email & Password authentication');
			}
			const signInUrl = `${baseUrl}${AUTH_SIGN_IN_PATH}`;
			console.log(LOG_PREFIX, 'sign-in attempt', { signInUrl });
			const response = await fetch(signInUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Accept: 'application/json',
					'User-Agent': 'n8n-nodes-hacknotice/1.0',
				},
				body: new URLSearchParams({ email, password }).toString(),
			});
			const text = await response.text();
			console.log(LOG_PREFIX, 'sign-in response', {
				status: response.status,
				statusText: response.statusText,
				bodyLength: text.length,
				bodyPreview: text.slice(0, 100),
			});
			if (!response.ok) {
				const isCloudflareChallenge =
					response.status === 403 &&
					(text.includes('Just a moment') || text.includes('cf_chl_opt') || text.includes('challenge-platform'));
				if (isCloudflareChallenge) {
					throw new Error(
						'HackNotice sign-in returned 403: the auth endpoint appears to be behind Cloudflare bot protection, which blocks this request. Use "API Key" authentication instead, or use an Auth URL that is not behind Cloudflare (e.g. an internal or API-only auth endpoint).',
					);
				}
				throw new Error(`HackNotice sign-in failed: ${response.status} ${response.statusText}${text ? ` - ${text.slice(0, 200)}` : ''}`);
			}
			let data: { token?: string };
			try {
				data = JSON.parse(text) as { token?: string };
			} catch {
				throw new Error('HackNotice sign-in response was not valid JSON');
			}
			const token = data?.token;
			if (!token) {
				console.error(LOG_PREFIX, 'sign-in response missing token', { keys: Object.keys(data || {}) });
				throw new Error('HackNotice sign-in response did not contain a token');
			}
			console.log(LOG_PREFIX, 'Sign-in successful. JWT received. Token expires after 24 hours.');
			return buildAndLogFinalOptions({ Authorization: `JWT ${token}` });
		}

		// API Key
		const apiKey = credentials.apiKey as string;
		if (!apiKey) {
			console.error(LOG_PREFIX, 'API Key is empty');
			throw new Error('API Key is required');
		}
		console.log(LOG_PREFIX, 'using API Key auth for request');
		return buildAndLogFinalOptions({ Authorization: `Bearer ${apiKey}` });
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.baseUrl}}',
			url: '/credentials/test',
			method: 'GET',
		},
	};
}
