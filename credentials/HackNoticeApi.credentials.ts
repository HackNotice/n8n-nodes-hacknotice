import type {
	IAuthenticate,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

const AUTH_SIGN_IN_PATH = '/auth/sign_in';

export class HackNoticeApi implements ICredentialType {
	name = 'hackNoticeApi';

	displayName = 'HackNotice API';

	icon: Icon = { light: 'file:../icons/hacknotice.svg', dark: 'file:../icons/hacknotice-dark.svg' };

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
			displayOptions: { show: { authentication: ['emailPassword', 'apiKey'] } },
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			displayOptions: { show: { authentication: ['emailPassword', 'apiKey'] } },
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

		const buildAndLogFinalOptions = (headers: Record<string, string>) => {
			const finalOptions = {
				...requestOptions,
				headers: {
					...requestOptions.headers,
					...headers,
				},
			};

			return finalOptions;
		};

		if (auth === 'emailPassword') {
			const email = credentials.email as string;
			const password = credentials.password as string;
			if (!baseUrl || !email || !password) {
				throw new Error('Email, Password, and API Base URL are required for Email & Password authentication');
			}
			const signInUrl = `${baseUrl}${AUTH_SIGN_IN_PATH}`;
			
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
				throw new Error('HackNotice sign-in response did not contain a token');
			}
			return buildAndLogFinalOptions({ Authorization: `JWT ${token}` });
		}

		// API Key
		const apiKey = credentials.apiKey as string;
		if (!apiKey) {
			throw new Error('API Key is required');
		}
		return buildAndLogFinalOptions({ Authorization: `Bearer ${apiKey}` });
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.baseUrl}}',
			url: '/auth/verify',
			method: 'POST',
		},
	};
}
