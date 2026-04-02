import {
	type IExecuteFunctions,
	ILoadOptionsFunctions,
	type INodeExecutionData,
	type IDataObject,
	INodePropertyOptions,
	type JsonObject,
	NodeConnectionTypes,
	NodeApiError,
	NodeOperationError,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { thirdPartyAlertsDescription } from './resources/thirdPartyAlerts';
import { firstPartyAlertsDescription } from './resources/firstPartyAlerts';
import { researchDescription } from './resources/research';
import { endUserAlertsDescription } from './resources/endUserAlerts';

const API_BASE_URL = 'https://extensionapi.hacknotice.com';
const EMPTY_OPTION: INodePropertyOptions = { name: '', value: '' };

type SavedSearchListItem = {
	id?: string;
	name?: string;
	search?: unknown;
	endpoint?: string;
};

/** Keys we never take from saved-search JSON — time window comes only from Limit by Time. */
const TIME_KEYS_FROM_SAVED_SEARCH = [
	'hours_ago',
	'start_date',
	'end_date',
	'startdate',
	'enddate',
] as const;

function stripSavedSearchTimeFields(body: Record<string, unknown>): void {
	for (const key of TIME_KEYS_FROM_SAVED_SEARCH) {
		delete body[key];
	}
}

function formatDateOnlyLocal(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/**
 * Applies the node's "Limit by Time" (`timeRange`). Any time fields from the saved search are removed first.
 * - lastDay → `hours_ago: 24`
 * - lastWeek → `start_date` or `startdate` (research) = today minus 7 days (date only)
 * - lastMonth → same with today minus one calendar month
 */
function applyLimitByTime(body: Record<string, unknown>, timeRange: string, isResearch: boolean): void {
	stripSavedSearchTimeFields(body);

	if (timeRange === 'lastDay') {
		body.hours_ago = 24;
		return;
	}

	const d = new Date();
	if (timeRange === 'lastWeek') {
		d.setDate(d.getDate() - 7);
	} else if (timeRange === 'lastMonth') {
		d.setMonth(d.getMonth() - 1);
	} else {
		body.hours_ago = 24;
		return;
	}

	d.setHours(0, 0, 0, 0);
	const dateOnly = formatDateOnlyLocal(d);

	if (isResearch) {
		body.startdate = dateOnly;
	} else {
		body.start_date = dateOnly;
	}
}

async function getBaseUrl(this: ILoadOptionsFunctions): Promise<string> {
	return API_BASE_URL;
}

const END_USER_SAVED_SEARCH_LOG_MAX = 24_000;

function logEndUserSavedSearchDebug(message: string, payload: unknown): void {
	const line = `[HackNotice endUserSavedSearches] ${message} ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`;
	// eslint-disable-next-line no-console -- intentional debug for loadOptions troubleshooting (n8n server stdout)
	console.log(line.length > END_USER_SAVED_SEARCH_LOG_MAX ? `${line.slice(0, END_USER_SAVED_SEARCH_LOG_MAX)}…[truncated]` : line);
}

async function getSavedSearchOptions(
	this: ILoadOptionsFunctions,
	url: string,
	valueMapper: (item: SavedSearchListItem) => string,
	options?: { logEndUserSavedSearches?: boolean },
): Promise<INodePropertyOptions[]> {
	const log = options?.logEndUserSavedSearches === true;

	if (log) {
		logEndUserSavedSearchDebug('request', { method: 'GET', url });
	}

	let response: unknown;
	try {
		response = await this.helpers.httpRequestWithAuthentication.call(this, 'hackNoticeApi', {
			method: 'GET',
			url,
			json: true,
		});
	} catch (error) {
		if (log) {
			logEndUserSavedSearchDebug('response error', {
				url,
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
		}
		throw error;
	}

	if (log) {
		if (Array.isArray(response)) {
			logEndUserSavedSearchDebug('response', {
				ok: true,
				itemCount: response.length,
				body: response,
			});
		} else {
			logEndUserSavedSearchDebug('response (non-array — dropdown may be empty)', {
				type: typeof response,
				body: response,
			});
		}
	}

	const list = response as SavedSearchListItem[];

	if (!Array.isArray(list)) {
		return [EMPTY_OPTION];
	}

	const mapped = list
		.filter((item) => item && item.search != null)
		.map((item) => ({
			name: item.name ?? '',
			value: valueMapper(item),
		}));

	return [EMPTY_OPTION, ...mapped];
}

type ResearchEndpointFilter = 'phrase' | 'wordpool';

async function getResearchSavedSearchOptions(
	this: ILoadOptionsFunctions,
	filter: ResearchEndpointFilter,
): Promise<INodePropertyOptions[]> {
	const baseUrl = await getBaseUrl.call(this);
	const endpointQuery = filter === 'wordpool' ? 'wordpool' : 'phrase';
	const modernUrl = `${baseUrl}/saved-searches/research?endpoint=${endpointQuery}&limit=1000`;

	const phraseValueMapper = (item: SavedSearchListItem) =>
		JSON.stringify({
			id: item.id ?? '',
			endpoint: item.endpoint ?? '',
			search: item.search ?? {},
		});

	const wordpoolValueMapper = (item: SavedSearchListItem) =>
		JSON.stringify({
			id: item.id ?? '',
			endpoint: item.endpoint ?? 'wordpool',
			search: item.search ?? {},
		});

	const valueMapper = filter === 'wordpool' ? wordpoolValueMapper : phraseValueMapper;
	return await getSavedSearchOptions.call(this, modernUrl, valueMapper);
}

export class HackNotice implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HackNotice',
		name: 'hackNotice',
		icon: { light: 'file:../../icons/hacknotice.svg', dark: 'file:../../icons/hacknotice-dark.svg' },
		group: ['input'],
		defaultVersion: 1,
		version: [1],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Get alerts from the HackNotice API',
		defaults: {
			name: 'HackNotice',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'hackNoticeApi',
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
						name: 'Third Party Alert',
						value: 'thirdPartyAlerts',
					},
					{
						name: 'First Party Alert',
						value: 'firstPartyAlerts',
					},
					{
						name: 'Research',
						value: 'research',
					},
					{
						name: 'End User',
						value: 'endUserAlerts',
					},
				],
				default: 'thirdPartyAlerts',
			},
			...thirdPartyAlertsDescription,
			...firstPartyAlertsDescription,
			...researchDescription,
			...endUserAlertsDescription,
		],
	};

	methods = {
		loadOptions: {
			async getThirdPartySavedSearches(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const baseUrl = await getBaseUrl.call(this);
				return await getSavedSearchOptions.call(
					this,
					`${baseUrl}/saved-searches/thirdparty?limit=1000`,
					(item) => JSON.stringify(item.search ?? {}),
				);
			},

			async getFirstPartySavedSearches(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const baseUrl = await getBaseUrl.call(this);
				return await getSavedSearchOptions.call(
					this,
					`${baseUrl}/saved-searches/firstparty?limit=1000`,
					(item) => JSON.stringify(item.search ?? {}),
				);
			},

			async getEndUserSavedSearches(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const baseUrl = await getBaseUrl.call(this);
				return await getSavedSearchOptions.call(
					this,
					`${baseUrl}/saved-searches/enduser?limit=1000`,
					(item) => JSON.stringify(item.search ?? {}),
					{ logEndUserSavedSearches: true },
				);
			},

			async getPhraseResearchSavedSearches(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				return await getResearchSavedSearchOptions.call(this, 'phrase');
			},

			async getWordpoolResearchSavedSearches(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				return await getResearchSavedSearchOptions.call(this, 'wordpool');
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const PAGE_SIZE = 50;
		const MAX_ITEMS = 1_000;

		const allowedOperationsByResource: Record<string, string[]> = {
			thirdPartyAlerts: ['getThirdPartyAlerts'],
			firstPartyAlerts: ['getFirstPartyAlerts'],
			research: ['getPhraseAlerts', 'getWordpoolAlerts'],
			endUserAlerts: ['getEndUserAlerts'],
		};

		const endpointByResource: Record<string, string> = {
			thirdPartyAlerts: '/hackalerts/page',
			firstPartyAlerts: '/domainalerts/page',
			endUserAlerts: '/enduseralerts/page',
		};

		const savedSearchParamByResource: Record<string, string> = {
			thirdPartyAlerts: 'thirdPartySavedSearchId',
			firstPartyAlerts: 'firstPartySavedSearchId',
			endUserAlerts: 'endUserSavedSearchId',
		};

		const extractItems = (response: unknown): unknown[] => {
			if (Array.isArray(response)) return response;
			if (response && typeof response === 'object') {
				const r = response as Record<string, unknown>;
				if (Array.isArray(r.data)) return r.data;
				if (Array.isArray(r.results)) return r.results;
				if (Array.isArray(r.items)) return r.items;
			}
			// Fallback: if the response isn't an array, return it as a single item.
			// This keeps existing operations from breaking on unexpected response shapes.
			return response !== undefined ? [response] : [];
		};

		// Parses the saved-search parameter into the request body (third/first/end user).
		const parseSavedSearchBody = (raw: unknown): Record<string, unknown> => {
			if (typeof raw !== 'string' || raw.trim() === '') return {};
			try {
				const parsed = JSON.parse(raw);
				return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
			} catch {
				return {};
			}
		};

		// Research: JSON from GET /saved-searches/research?endpoint=phrase|wordpool, or legacy `__research__::` prefix.
		const parseResearchSavedSearch = (
			raw: unknown,
		): { body: Record<string, unknown>; savedEndpoint?: string } => {
			if (typeof raw !== 'string' || raw.trim() === '') return { body: {} };
			const trimmed = raw.trim();
			if (trimmed.startsWith('{')) {
				try {
					const parsed = JSON.parse(trimmed) as {
						id?: string;
						endpoint?: string;
						search?: Record<string, unknown>;
					};
					if (
						parsed.search &&
						typeof parsed.search === 'object' &&
						parsed.search !== null &&
						!Array.isArray(parsed.search)
					) {
						return { body: { ...parsed.search }, savedEndpoint: parsed.endpoint };
					}
				} catch {
					/* fall through */
				}
			}
			const prefix = '__research__::';
			if (raw.startsWith(prefix)) {
				const after = raw.slice(prefix.length);
				const idx = after.indexOf('::');
				const jsonStr = idx >= 0 ? after.slice(idx + 2) : after;
				const parsed = jsonStr ? JSON.parse(jsonStr) : {};
				return {
					body:
						parsed && typeof parsed === 'object' && !Array.isArray(parsed)
							? (parsed as Record<string, unknown>)
							: {},
				};
			}
			try {
				const parsed = JSON.parse(raw);
				return {
					body:
						parsed && typeof parsed === 'object' && !Array.isArray(parsed)
							? (parsed as Record<string, unknown>)
							: {},
				};
			} catch {
				return { body: {} };
			}
		};

		const baseUrl = API_BASE_URL;

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				const allowedOps = allowedOperationsByResource[resource] ?? [];
				if (!allowedOps.includes(operation)) {
					throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, {
						itemIndex: i,
					});
				}

				const endpointBase = endpointByResource[resource];
				if (resource !== 'research' && !endpointBase) {
					throw new NodeOperationError(this.getNode(), `Unsupported resource: ${resource}`, {
						itemIndex: i,
					});
				}

				// Optional safety params (may not be exposed in the UI yet).
				const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
				const limitParam = this.getNodeParameter('limit', i, PAGE_SIZE) as number;
				const safeLimit =
					typeof limitParam === 'number' && limitParam >= 0
						? Math.min(limitParam, PAGE_SIZE, MAX_ITEMS)
						: PAGE_SIZE;

				let requestBody: Record<string, unknown> = {};
				let researchPhraseEndpoint: string | undefined;

				if (resource === 'research') {
					const savedSearchRaw =
						operation === 'getPhraseAlerts'
							? (this.getNodeParameter('phraseResearchSavedSearch', i, '') as unknown)
							: (this.getNodeParameter('wordpoolResearchSavedSearch', i, '') as unknown);
					const parsed = parseResearchSavedSearch(savedSearchRaw);
					requestBody = parsed.body;
					researchPhraseEndpoint = parsed.savedEndpoint;
				} else {
					const savedSearchParamName = savedSearchParamByResource[resource];
					const savedSearchRaw = this.getNodeParameter(savedSearchParamName, i, '') as unknown;
					requestBody = parseSavedSearchBody(savedSearchRaw);
				}

				const timeRange = this.getNodeParameter('timeRange', i, 'lastDay') as string;
				applyLimitByTime(requestBody, timeRange, resource === 'research');

				const results: unknown[] = [];

				const requestPage = async (page: number): Promise<unknown[]> => {
					let url: string;
					if (resource === 'research') {
						if (operation === 'getWordpoolAlerts') {
							url = `${baseUrl}/research8/search/pool/page/${page}`;
						} else if (operation === 'getPhraseAlerts') {
							const ep = (researchPhraseEndpoint || '').toLowerCase();
							url =
								ep === 'filename'
									? `${baseUrl}/research8/search/filename/term/page/${page}`
									: `${baseUrl}/research8/search/term/page/${page}`;
						} else {
							url = `${baseUrl}/research8/search/term/page/${page}`;
						}
					} else {
						url = `${baseUrl}${endpointBase}/${page}`;
					}
					
					// Use the node credentials + n8n helper that handles authentication.
					const pageResponse = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'hackNoticeApi',
						{
							method: 'POST',
							url,
							body: requestBody,
							json: true,
						},
					);
					return extractItems(pageResponse);
				};

				if (!returnAll) {
					const pageItems = await requestPage(0);
					results.push(...pageItems.slice(0, safeLimit));
				} else {
					// Fetch pages sequentially (page=0,1,2,...) until:
					// - last page has < PAGE_SIZE items, OR
					// - MAX_ITEMS is reached, OR
					// - API returns an empty page (extra protection vs infinite loops)
					let page = 0;
					while (results.length < MAX_ITEMS) {
						const pageItems = await requestPage(page);
						if (pageItems.length === 0) break;

						const remaining = MAX_ITEMS - results.length;
						results.push(...pageItems.slice(0, remaining));

						if (pageItems.length < PAGE_SIZE) break;
						page++;
					}
				}

				// Always output items as an array of json objects
				const jsonArray = this.helpers.returnJsonArray(results as unknown as IDataObject[]) as INodeExecutionData[];
				for (const data of jsonArray) {
					data.pairedItem = { item: i };
					returnData.push(data);
				}
			} catch (error) {
				// Keep validation/configuration failures as NodeOperationError.
				if (error instanceof NodeOperationError) {
					throw error;
				}

				// Wrap HTTP/API failures so status code and response body are visible in n8n UI.
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
