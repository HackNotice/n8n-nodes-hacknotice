/**
 * HackNotice MCP Node
 *
 * PURPOSE
 * ----
 * n8n node that talks to a running `hacknotice-mcp-server` over its
 * Streamable HTTP endpoint. Dynamically discovers every tool the server
 * exposes via `tools/list` and lets a workflow (or an AI Agent, since
 * `usableAsTool` is on) call any of them via `tools/call`.
 *
 * DATA SOURCES
 * ----
 * - hacknotice-mcp-server (Streamable HTTP, JSON-RPC 2.0).
 *
 * KEY CONCEPTS
 * ----
 * - Programmatic-style: each execution opens a short-lived MCP session
 *   (initialize → tools/call → DELETE) so we don't leak server resources.
 *   This sequencing is impossible to express declaratively.
 * - Tool selection uses `loadOptions` so the dropdown reflects whatever
 *   the live server reports — adding tools server-side requires no node
 *   rebuild.
 * - Tool arguments are accepted as a single JSON string. The MCP server
 *   already validates them against each tool's `inputSchema`, so we
 *   forward as-is and surface errors verbatim.
 * - `usableAsTool: true` lets an AI Agent node use this node directly;
 *   the agent passes `toolName` + `arguments` like any other tool.
 */
import {
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
	type IDataObject,
	NodeConnectionTypes,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import { McpStreamableHttpClient, type McpToolDescriptor } from './transport';

const RESOURCE_TOOL = 'tool';
const OP_CALL_TOOL = 'callTool';
const OP_LIST_TOOLS = 'listTools';

/** Truncates a tool description for the dropdown so it stays readable. */
function shortDescription(tool: McpToolDescriptor): string {
	const raw = (tool.description ?? '').replace(/\s+/g, ' ').trim();
	if (!raw) return tool.name;
	return raw.length > 120 ? `${raw.slice(0, 117)}…` : raw;
}

export class HackNoticeMcp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HackNotice MCP',
		name: 'hackNoticeMcp',
		icon: { light: 'file:../../icons/hacknotice.svg', dark: 'file:../../icons/hacknotice-dark.svg' },
		group: ['transform'],
		defaultVersion: 1,
		version: [1],
		subtitle: '={{$parameter["operation"] === "callTool" ? "call: " + ($parameter["toolName"] || "?") : "list tools"}}',
		description:
			'Discover and invoke tools exposed by a HackNotice MCP server (Streamable HTTP).',
		defaults: {
			name: 'HackNotice MCP',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'hackNoticeMcpApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Tool',
						value: RESOURCE_TOOL,
					},
				],
				default: RESOURCE_TOOL,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: [RESOURCE_TOOL],
					},
				},
				options: [
					{
						name: 'Call Tool',
						value: OP_CALL_TOOL,
						description: 'Invoke a single MCP tool by name',
						action: 'Call an MCP tool',
					},
					{
						name: 'List Tools',
						value: OP_LIST_TOOLS,
						description: 'Return every tool the MCP server currently exposes',
						action: 'List MCP tools',
					},
				],
				default: OP_CALL_TOOL,
			},
			{
				// Loaded dynamically from the live server's `tools/list`.
				// `loadOptionsDependsOn` ensures the dropdown refreshes whenever
				// the credential changes (different server = different tools).
				displayName: 'Tool Name or ID',
				name: 'toolName',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getMcpTools',
					loadOptionsDependsOn: ['hackNoticeMcpApi'],
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: [RESOURCE_TOOL],
						operation: [OP_CALL_TOOL],
					},
				},
				description: 'Pick the MCP tool to invoke. The list is loaded live from the configured MCP server. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Arguments (JSON)',
				name: 'toolArguments',
				type: 'json',
				default: '{}',
				required: true,
				typeOptions: {
					rows: 6,
				},
				displayOptions: {
					show: {
						resource: [RESOURCE_TOOL],
						operation: [OP_CALL_TOOL],
					},
				},
				description:
					'JSON object that will be passed verbatim as the tool arguments. Must match the tool inputSchema. Use {} when the tool accepts no arguments.',
				hint: 'Tip: run "List Tools" once and inspect the inputSchema field of the chosen tool.',
			},
			{
				displayName: 'Output Each Content Item Separately',
				name: 'splitContent',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						resource: [RESOURCE_TOOL],
						operation: [OP_CALL_TOOL],
					},
				},
				description:
					'Whether to emit one n8n item per entry of the tool result `content` array. Disable to emit a single item containing the full tool result.',
			},
		],
	};

	methods = {
		loadOptions: {
			/**
			 * Live-loads the tool list from the configured MCP server. Errors
			 * are surfaced as a single disabled-looking option so the UI does
			 * not crash before the user has saved valid credentials.
			 */
			async getMcpTools(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const client = new McpStreamableHttpClient(this);
				try {
					await client.open();
					const tools = await client.listTools();
					if (tools.length === 0) {
						return [{ name: 'No Tools Exposed by Server', value: '' }];
					}
					return tools
						.filter((tool) => Boolean(tool && tool.name))
						.map((tool) => ({
							name: tool.name,
							value: tool.name,
							description: shortDescription(tool),
						}));
				} catch (error) {
					const message =
						error instanceof Error ? error.message : 'Unknown error contacting MCP server';
					return [{ name: `Error loading tools: ${message}`, value: '' }];
				} finally {
					await client.close();
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// One client per execute() call: shared across input items so we
		// pay the initialize handshake cost only once. Always closed in
		// the `finally` block below to guarantee session cleanup even on
		// partial failures.
		const client = new McpStreamableHttpClient(this);
		try {
			await client.open();

			for (let i = 0; i < items.length; i++) {
				try {
					const resource = this.getNodeParameter('resource', i) as string;
					const operation = this.getNodeParameter('operation', i) as string;

					if (resource !== RESOURCE_TOOL) {
						throw new NodeOperationError(this.getNode(), `Unsupported resource: ${resource}`, {
							itemIndex: i,
						});
					}

					if (operation === OP_LIST_TOOLS) {
						const tools = await client.listTools();
						for (const tool of tools) {
							returnData.push({
								json: tool as unknown as IDataObject,
								pairedItem: { item: i },
							});
						}
						continue;
					}

					if (operation === OP_CALL_TOOL) {
						const toolName = (this.getNodeParameter('toolName', i, '') as string).trim();
						if (!toolName) {
							throw new NodeOperationError(
								this.getNode(),
								'Tool Name is required for Call Tool',
								{ itemIndex: i },
							);
						}

						const rawArgs = this.getNodeParameter('toolArguments', i, '{}') as unknown;
						const args = parseToolArguments(rawArgs, this.getNode().name, i);

						const splitContent = this.getNodeParameter('splitContent', i, true) as boolean;

						const result = await client.callTool(toolName, args);
						const content = Array.isArray(result.content) ? result.content : [];

						if (splitContent && content.length > 0) {
							for (const entry of content) {
								returnData.push({
									json: {
										...(entry as IDataObject),
										_toolName: toolName,
										_isError: Boolean(result.isError),
										...(result.structuredContent !== undefined
											? { _structuredContent: result.structuredContent as IDataObject }
											: {}),
									},
									pairedItem: { item: i },
								});
							}
						} else {
							returnData.push({
								json: {
									toolName,
									isError: Boolean(result.isError),
									content,
									...(result.structuredContent !== undefined
										? { structuredContent: result.structuredContent as IDataObject }
										: {}),
								},
								pairedItem: { item: i },
							});
						}
						continue;
					}

					throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, {
						itemIndex: i,
					});
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: { error: (error as Error).message },
							pairedItem: { item: i },
						});
						continue;
					}

					if (error instanceof NodeOperationError) {
						throw error;
					}

					throw new NodeApiError(this.getNode(), error as never, { itemIndex: i });
				}
			}
		} finally {
			await client.close();
		}

		return [returnData];
	}
}

/**
 * Accepts the `Arguments (JSON)` parameter as either a JSON string (the
 * common UI case) or an already-parsed object (when the value comes from
 * an expression). Returns a plain object suitable for `tools/call`.
 */
function parseToolArguments(
	raw: unknown,
	nodeName: string,
	itemIndex: number,
): Record<string, unknown> {
	if (raw == null || raw === '') return {};

	if (typeof raw === 'object' && !Array.isArray(raw)) {
		return raw as Record<string, unknown>;
	}

	if (typeof raw === 'string') {
		const trimmed = raw.trim();
		if (!trimmed) return {};
		try {
			const parsed = JSON.parse(trimmed);
			if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
				return parsed as Record<string, unknown>;
			}
		} catch (e) {
			throw new NodeOperationError(
				{ name: nodeName } as never,
				`Tool arguments must be a JSON object: ${(e as Error).message}`,
				{ itemIndex },
			);
		}
	}

	throw new NodeOperationError(
		{ name: nodeName } as never,
		'Tool arguments must be a JSON object',
		{ itemIndex },
	);
}
