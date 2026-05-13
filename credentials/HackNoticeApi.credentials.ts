import type {
	IAuthenticate,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

const AUTH_SIGN_IN_PATH = '/auth/sign_in';
const API_BASE_URL = 'https://extensionapi.hacknotice.com';
const AUTH_METHOD_API_KEY = 'apiKeyEmailPassword';
const AUTH_METHOD_INTEGRATION_KEY = 'integrationKey';

export class HackNoticeApi implements ICredentialType {
	name = 'hackNoticeApi';

	displayName = 'HackNotice API';

	icon: Icon = { light: 'file:../icons/hacknotice.svg', dark: 'file:../icons/hacknotice-dark.svg' };

	documentationUrl = 'https://documenter.getpostman.com/view/806684/RWaHzA6C';

	properties: INodeProperties[] = [
		{
			displayName: 'Authentication Method',
			name: 'authenticationMethod',
			type: 'options',
			default: AUTH_METHOD_API_KEY,
			options: [
				{
					name: 'API Key + Email + Password',
					value: AUTH_METHOD_API_KEY,
				},
				{
					name: 'Integration Key',
					value: AUTH_METHOD_INTEGRATION_KEY,
				},
			],
			description:
				'Choose the HackNotice authentication flow to use for all API requests made by this credential.',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			displayOptions: {
				show: {
					authenticationMethod: [AUTH_METHOD_API_KEY],
				},
			},
		},
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			placeholder: 'name@example.com',
			default: '',
			displayOptions: {
				show: {
					authenticationMethod: [AUTH_METHOD_API_KEY],
				},
			},
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			displayOptions: {
				show: {
					authenticationMethod: [AUTH_METHOD_API_KEY],
				},
			},
		},
		{
			displayName: 'Integration Key',
			name: 'integrationKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Per-user HackNotice integration secret. Sent as the X-HackNotice-Integration-Key header on every API request.',
			displayOptions: {
				show: {
					authenticationMethod: [AUTH_METHOD_INTEGRATION_KEY],
				},
			},
		},
	];

	authenticate: IAuthenticate = async (credentials, requestOptions) => {
		const buildFinalOptions = (headers: Record<string, string>) => {
			const finalOptions = {
				...requestOptions,
				headers: {
					...requestOptions.headers,
					...headers,
				},
			};

			return finalOptions;
		};

		const credentialData = credentials as unknown as Record<string, unknown>;
		const authenticationMethod = String(
			credentialData.authenticationMethod ??
				(credentialData.integrationKey ? AUTH_METHOD_INTEGRATION_KEY : AUTH_METHOD_API_KEY),
		);

		if (authenticationMethod === AUTH_METHOD_INTEGRATION_KEY) {
			const integrationKey = String(credentialData.integrationKey ?? '').trim();
			if (!integrationKey) {
				throw new Error('Integration Key is required for HackNotice API');
			}

			return buildFinalOptions({
				'X-HackNotice-Integration-Key': integrationKey,
			});
		}

		// n8n passes credential fields by the `name` property.
		// Keep a small fallback for legacy/renamed fields to avoid hard failures.
		const requestHeaders = (requestOptions as unknown as { headers?: Record<string, unknown> })?.headers;
		const apiKeyFromRequest =
			(requestHeaders as Record<string, unknown> | undefined)?.apikey ??
			(requestHeaders as Record<string, unknown> | undefined)?.apiKey ??
			'';

		const apiKeyRaw =
			(credentials as unknown as Record<string, unknown>)?.apiKey ??
			(credentials as unknown as Record<string, unknown>)?.apikey ??
			(credentials as unknown as Record<string, unknown>)?.api_key ??
			apiKeyFromRequest ??
			'';
		const apiKey = String(apiKeyRaw ?? '').trim();
		if (!apiKey) {
			// Don't log the secret itself; log which keys exist and whether the apiKey is non-empty.
			const credentialKeys = Object.keys(credentialData);
			const emailPresent = Boolean(credentialData.email);
			const apiKeyFromRequestPresent = Boolean(apiKeyFromRequest);
			throw new Error(
				`API Key is required (credentialKeys=[${credentialKeys.join(',')}], emailPresent=${String(
					emailPresent,
				)}, apiKeyFromRequestPresent=${String(apiKeyFromRequestPresent)})`,
			);
		}

		// JWT token is obtained via the sign-in endpoint.
		const email = credentialData.email as string;
		const password = credentialData.password as string;
		if (!email || !password) throw new Error('Email and Password are required to obtain the JWT token');

		const signInUrl = `${API_BASE_URL}${AUTH_SIGN_IN_PATH}`;

		const response = await fetch(signInUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json',
				'User-Agent': 'n8n-nodes-hacknotice/1.0',
				'apikey': apiKey,
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
					'HackNotice sign-in returned 403: the auth endpoint appears to be behind Cloudflare bot protection, which blocks this request.',
				);
			}
			throw new Error(
				`HackNotice sign-in failed: ${response.status} ${response.statusText}${text ? ` - ${text.slice(0, 200)}` : ''}`,
			);
		}

		let data: { token?: string };
		try {
			data = JSON.parse(text) as { token?: string };
		} catch {
			throw new Error('HackNotice sign-in response was not valid JSON');
		}

		const token = data?.token;
		if (!token) throw new Error('HackNotice sign-in response did not contain a token');

		return buildFinalOptions({
			apikey: apiKey,
			Authorization: `JWT ${token}`,
		});
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: API_BASE_URL,
			url: '/auth/verify',
			method: 'POST',
		},
	};
}
