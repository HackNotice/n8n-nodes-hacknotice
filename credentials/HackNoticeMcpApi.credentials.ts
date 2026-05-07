/**
 * HackNotice MCP API Credential
 *
 * PURPOSE
 * ----
 * Authenticates the HackNotice MCP node against a running hacknotice-mcp-server
 * (Streamable HTTP, JSON-RPC 2.0). It owns:
 *  - the `endpointUrl` (e.g. https://host:port/mcp)
 *  - the per-user `integrationKey` sent as `X-HackNotice-Integration-Key`
 *
 * DATA SOURCES
 * ----
 * - `mcp-server` Streamable HTTP endpoint (validates `integrationKey` via
 *   prod-api during tool execution; see `MCP_SECRET_KEY_AUTH_FLOW.md`).
 *
 * KEY CONCEPTS
 * ----
 * - The `authenticate` function injects MCP transport headers
 *   (`Accept`, `X-HackNotice-Integration-Key`).
 * - `test` performs a JSON-RPC `initialize` round-trip; a 200 means the
 *   server is reachable and the integration key is accepted.
 *   The transient session created by the test is dropped server-side
 *   when the transport closes — no manual cleanup required.
 */
import type {
	IAuthenticate,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

const MCP_PROTOCOL_VERSION = '2024-11-05';

export class HackNoticeMcpApi implements ICredentialType {
	name = 'hackNoticeMcpApi';

	displayName = 'HackNotice MCP API';

	icon: Icon = { light: 'file:../icons/hacknotice.svg', dark: 'file:../icons/hacknotice-dark.svg' };

	documentationUrl = 'https://github.com/HackNotice/n8n-nodes-hacknotice#hacknotice-mcp-node';

	properties: INodeProperties[] = [
		{
			displayName: 'MCP Endpoint URL',
			name: 'endpointUrl',
			type: 'string',
			default: '',
			placeholder: 'https://mcp.example.com:13348/mcp',
			description:
				'Full URL of the HackNotice MCP Streamable HTTP endpoint, including the path (default mcp-server path is /mcp).',
			required: true,
		},
		{
			displayName: 'Integration Key',
			name: 'integrationKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Per-user HackNotice integration secret. Sent as the X-HackNotice-Integration-Key header on every MCP request; mcp-server uses it to identify the calling user.',
			required: true,
		},
	];

	/**
	 * Injects MCP transport headers onto every outbound request issued
	 * through `httpRequestWithAuthentication` for this credential.
	 *
	 * Note: We intentionally do NOT preset a Content-Type here so callers
	 * can choose between `application/json` (POST) and no body (GET/DELETE).
	 */
	authenticate: IAuthenticate = async (credentials, requestOptions) => {
		const integrationKey = String(
			(credentials as Record<string, unknown>)?.integrationKey ?? '',
		).trim();
		if (!integrationKey) {
			throw new Error('Integration Key is required for HackNotice MCP API');
		}

		const existingHeaders = (requestOptions.headers as Record<string, string> | undefined) ?? {};

		const headers: Record<string, string> = {
			...existingHeaders,
			'X-HackNotice-Integration-Key': integrationKey,
			Accept: existingHeaders.Accept ?? 'application/json, text/event-stream',
		};

		return {
			...requestOptions,
			headers,
		};
	};

	/**
	 * Validates the credential by issuing a JSON-RPC `initialize` request to
	 * the MCP endpoint. mcp-server replies with HTTP 200 and a body that
	 * contains `result.protocolVersion` when the integration key is accepted.
	 */
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.endpointUrl}}',
			url: '',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json, text/event-stream',
			},
			body: {
				jsonrpc: '2.0',
				id: 1,
				method: 'initialize',
				params: {
					protocolVersion: MCP_PROTOCOL_VERSION,
					capabilities: {},
					clientInfo: {
						name: 'n8n-nodes-hacknotice-mcp-credential-test',
						version: '1.0.0',
					},
				},
			},
		},
	};
}
