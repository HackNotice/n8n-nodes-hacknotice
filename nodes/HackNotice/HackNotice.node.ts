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
import { firstPartyWatchlistDescription } from './resources/firstPartyWatchlist';
import { researchDescription } from './resources/research';
import { endUserAlertsDescription } from './resources/endUserAlerts';
import { endUserWatchlistDescription } from './resources/endUserWatchlist';
import { thirdPartyWatchlistDescription } from './resources/thirdPartyWatchlist';
import { assessmentsResourceDescription } from './resources/assessments';
import { executeHackNoticeAssessmentItem } from './assessmentExecute';
import { HACKNOTICE_ASSESSMENT_RESOURCES_SET, type AssessmentResourceKey } from './assessmentRegistry';

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

async function getSavedSearchOptions(
	this: ILoadOptionsFunctions,
	url: string,
	valueMapper: (item: SavedSearchListItem) => string,
): Promise<INodePropertyOptions[]> {
	const response = await this.helpers.httpRequestWithAuthentication.call(this, 'hackNoticeApi', {
		method: 'GET',
		url,
		json: true,
	});

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
		description: 'Call the HackNotice extensions API (alerts, assessments, and more)',
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
						name: 'Assessment',
						value: 'assessment',
					},
					{
						name: 'Assessment Data File',
						value: 'assessmentDataFile',
					},
					{
						name: 'Assessment Data File (Invited)',
						value: 'invitedAssessmentDataFile',
					},
					{
						name: 'Assessment Event',
						value: 'assessmentEvent',
					},
					{
						name: 'Assessment Invite',
						value: 'assessmentInvite',
					},
					{
						name: 'Assessment Preference',
						value: 'assessmentPreference',
					},
					{
						name: 'Assessment Template',
						value: 'assessmentTemplate',
					},
					{
						name: 'End User',
						value: 'endUserAlerts',
					},
					{
						name: 'End User Watchlist',
						value: 'endUserWatchlist',
					},
					{
						name: 'First Party Alert',
						value: 'firstPartyAlerts',
					},
					{
						name: 'First Party Watchlist',
						value: 'firstPartyWatchlist',
					},
					{
						name: 'Research',
						value: 'research',
					},
					{
						name: 'Third Party Alert',
						value: 'thirdPartyAlerts',
					},
					{
						name: 'Third Party Watchlist',
						value: 'thirdPartyWatchlist',
					},
				],
				default: 'thirdPartyAlerts',
			},
			...thirdPartyAlertsDescription,
			...firstPartyAlertsDescription,
			...firstPartyWatchlistDescription,
			...researchDescription,
			...endUserAlertsDescription,
			...endUserWatchlistDescription,
			...thirdPartyWatchlistDescription,
			...assessmentsResourceDescription,
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
			thirdPartyWatchlist: ['deleteById', 'getById', 'getWatchlistDomains', 'searchDomain', 'updateById'],
			firstPartyAlerts: ['getFirstPartyAlerts'],
			firstPartyWatchlist: ['createItem', 'deleteById', 'getById', 'getWatchlistItems', 'searchItem'],
			research: ['getPhraseAlerts', 'getWordpoolAlerts'],
			endUserAlerts: ['getEndUserAlerts'],
			endUserWatchlist: ['addItemToWatchlist', 'deleteById', 'getAll', 'getById', 'searchForEmail'],
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

				if (HACKNOTICE_ASSESSMENT_RESOURCES_SET.has(resource)) {
					const rows = await executeHackNoticeAssessmentItem(
						this,
						i,
						baseUrl,
						resource as AssessmentResourceKey,
						operation,
					);
					returnData.push(...rows);
					continue;
				}

				if (resource === 'thirdPartyWatchlist') {
					let url: string;
					let method: 'DELETE' | 'GET' | 'POST' | 'PUT' = 'POST';
					let headers: IDataObject | undefined;
					let body: URLSearchParams | IDataObject | undefined;

					if (operation === 'getWatchlistDomains') {
						const pageNum = this.getNodeParameter('thirdPartyWatchlistPage', i, 0) as number;
						if (!Number.isFinite(pageNum) || pageNum < 0) {
							throw new NodeOperationError(this.getNode(), 'Page Number must be a non-negative integer', {
								itemIndex: i,
							});
						}
						const sort = this.getNodeParameter('thirdPartyWatchlistSort', i, 'alphadomain') as string;
						url = `${baseUrl}/hackwatchlist/page/${Math.floor(pageNum)}`;
						body = new URLSearchParams();
						body.set('sort', sort);
						headers = {
							'Content-Type': 'application/x-www-form-urlencoded',
						};
					} else if (operation === 'searchDomain') {
						const domain = String(this.getNodeParameter('thirdPartyWatchlistDomain', i, '')).trim();
						if (!domain) {
							throw new NodeOperationError(this.getNode(), 'Domain is required', {
								itemIndex: i,
							});
						}
						url = `${baseUrl}/hackwatchlist/search`;
						body = new URLSearchParams();
						body.set('term', domain);
						headers = {
							'Content-Type': 'application/x-www-form-urlencoded',
						};
					} else if (operation === 'getById' || operation === 'deleteById' || operation === 'updateById') {
						const watchlistId = String(this.getNodeParameter('thirdPartyWatchlistId', i, '')).trim();
						if (!watchlistId) {
							throw new NodeOperationError(this.getNode(), 'Watchlist ID is required', {
								itemIndex: i,
							});
						}

						url = `${baseUrl}/hackwatchlist/${encodeURIComponent(watchlistId)}`;

						if (operation === 'getById') {
							method = 'GET';
						} else if (operation === 'deleteById') {
							method = 'DELETE';
						} else {
							method = 'PUT';
							const rawTags = this.getNodeParameter('thirdPartyWatchlistTags', i, []) as unknown;
							let tags: unknown = rawTags;
							if (typeof rawTags === 'string') {
								try {
									tags = JSON.parse(rawTags) as unknown;
								} catch {
									throw new NodeOperationError(this.getNode(), 'Tags must be a valid JSON array', {
										itemIndex: i,
									});
								}
							}

							if (!Array.isArray(tags)) {
								throw new NodeOperationError(this.getNode(), 'Tags must be a JSON array', {
									itemIndex: i,
								});
							}

							body = { tags };
							headers = {
								'Content-Type': 'application/json',
							};
						}
					} else {
						throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, {
							itemIndex: i,
						});
					}

					const response = await this.helpers.httpRequestWithAuthentication.call(this, 'hackNoticeApi', {
						method,
						url,
						headers,
						body,
						json: operation === 'updateById',
					});

					let parsedResponse = response as unknown;
					if (typeof response === 'string') {
						try {
							parsedResponse = JSON.parse(response) as unknown;
						} catch {
							parsedResponse = { value: response };
						}
					}

					const watchlistItems = extractItems(parsedResponse).map((item) =>
						item && typeof item === 'object' ? (item as IDataObject) : ({ value: item } as IDataObject),
					);
					const jsonArray = this.helpers.returnJsonArray(watchlistItems) as INodeExecutionData[];
					for (const data of jsonArray) {
						data.pairedItem = { item: i };
						returnData.push(data);
					}
					continue;
				}

				if (resource === 'firstPartyWatchlist') {
					let url: string;
					let method: 'DELETE' | 'GET' | 'POST' = 'POST';
					let headers: IDataObject | undefined;
					let body: URLSearchParams | IDataObject | undefined;

					const parseJsonParameter = (raw: unknown, fieldName: string): IDataObject => {
						if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
							return raw as IDataObject;
						}
						if (typeof raw !== 'string' || raw.trim() === '') {
							return {};
						}
						try {
							const parsed = JSON.parse(raw) as unknown;
							if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
								return parsed as IDataObject;
							}
						} catch {
							throw new NodeOperationError(this.getNode(), `${fieldName} must be valid JSON`, {
								itemIndex: i,
							});
						}
						throw new NodeOperationError(this.getNode(), `${fieldName} must be a JSON object`, {
							itemIndex: i,
						});
					};

					if (operation === 'getWatchlistItems') {
						const pageNum = this.getNodeParameter('firstPartyWatchlistPage', i, 0) as number;
						if (!Number.isFinite(pageNum) || pageNum < 0) {
							throw new NodeOperationError(this.getNode(), 'Page Number must be a non-negative integer', {
								itemIndex: i,
							});
						}
						url = `${baseUrl}/domainwatchlist/page/${Math.floor(pageNum)}`;
						body = parseJsonParameter(
							this.getNodeParameter('firstPartyWatchlistRequestBody', i, {}),
							'Request Body',
						);
						headers = {
							'Content-Type': 'application/json',
						};
					} else if (operation === 'searchItem') {
						const domain = String(this.getNodeParameter('firstPartyWatchlistDomain', i, '')).trim();
						if (!domain) {
							throw new NodeOperationError(this.getNode(), 'Domain is required', {
								itemIndex: i,
							});
						}
						url = `${baseUrl}/domainwatchlist/search`;
						body = {
							...parseJsonParameter(
								this.getNodeParameter('firstPartyWatchlistSearchOptions', i, {}),
								'Search Options',
							),
							term: domain,
						};
						headers = {
							'Content-Type': 'application/json',
						};
					} else if (operation === 'createItem') {
						const domain = String(this.getNodeParameter('firstPartyWatchlistDomain', i, '')).trim();
						if (!domain) {
							throw new NodeOperationError(this.getNode(), 'Domain is required', {
								itemIndex: i,
							});
						}
						url = `${baseUrl}/domainwatchlist/create`;
						body = new URLSearchParams();
						body.set('domain', domain);
						headers = {
							'Content-Type': 'application/x-www-form-urlencoded',
						};
					} else if (operation === 'getById' || operation === 'deleteById') {
						const watchlistId = String(this.getNodeParameter('firstPartyWatchlistId', i, '')).trim();
						if (!watchlistId) {
							throw new NodeOperationError(this.getNode(), 'Watchlist ID is required', {
								itemIndex: i,
							});
						}
						method = operation === 'getById' ? 'GET' : 'DELETE';
						url = `${baseUrl}/domainwatchlist/${encodeURIComponent(watchlistId)}`;
					} else {
						throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, {
							itemIndex: i,
						});
					}

					const response = await this.helpers.httpRequestWithAuthentication.call(this, 'hackNoticeApi', {
						method,
						url,
						headers,
						body,
						json: !(body instanceof URLSearchParams),
					});

					let parsedResponse = response as unknown;
					if (typeof response === 'string') {
						try {
							parsedResponse = JSON.parse(response) as unknown;
						} catch {
							parsedResponse = { value: response };
						}
					}

					const watchlistItems = extractItems(parsedResponse).map((item) =>
						item && typeof item === 'object' ? (item as IDataObject) : ({ value: item } as IDataObject),
					);
					const jsonArray = this.helpers.returnJsonArray(watchlistItems) as INodeExecutionData[];
					for (const data of jsonArray) {
						data.pairedItem = { item: i };
						returnData.push(data);
					}
					continue;
				}

				if (resource === 'endUserWatchlist') {
					let url: string;
					let method: 'DELETE' | 'GET' | 'POST' = 'POST';
					let headers: IDataObject | undefined;
					let body: URLSearchParams | IDataObject | undefined;

					const parseTagsArray = (raw: unknown): unknown[] => {
						if (Array.isArray(raw)) return raw;
						if (typeof raw !== 'string' || raw.trim() === '') return [];
						try {
							const parsed = JSON.parse(raw) as unknown;
							if (Array.isArray(parsed)) return parsed;
						} catch {
							throw new NodeOperationError(this.getNode(), 'Tags must be a valid JSON array', {
								itemIndex: i,
							});
						}
						throw new NodeOperationError(this.getNode(), 'Tags must be a JSON array', {
							itemIndex: i,
						});
					};

					if (operation === 'getAll') {
						const pageNum = this.getNodeParameter('endUserWatchlistPage', i, 0) as number;
						if (!Number.isFinite(pageNum) || pageNum < 0) {
							throw new NodeOperationError(this.getNode(), 'Page Number must be a non-negative integer', {
								itemIndex: i,
							});
						}
						method = 'GET';
						url = `${baseUrl}/enduserwatchlist/page/${Math.floor(pageNum)}`;
					} else if (operation === 'searchForEmail') {
						const email = String(this.getNodeParameter('endUserWatchlistEmail', i, '')).trim();
						if (!email) {
							throw new NodeOperationError(this.getNode(), 'Email or Hash is required', {
								itemIndex: i,
							});
						}
						url = `${baseUrl}/enduserwatchlist/search`;
						body = new URLSearchParams();
						body.set('term', email);
						headers = {
							'Content-Type': 'application/x-www-form-urlencoded',
						};
					} else if (operation === 'addItemToWatchlist') {
						const email = String(this.getNodeParameter('endUserWatchlistEmail', i, '')).trim();
						if (!email) {
							throw new NodeOperationError(this.getNode(), 'Email or Hash is required', {
								itemIndex: i,
							});
						}
						const tags = parseTagsArray(this.getNodeParameter('endUserWatchlistTags', i, []));
						const hashed = this.getNodeParameter('endUserWatchlistHashed', i, false) as boolean;
						url = `${baseUrl}/enduserwatchlist/create`;
						body = {
							email,
							tags,
						};
						if (hashed) {
							body.hashed = true;
						}
						headers = {
							'Content-Type': 'application/json',
						};
					} else if (operation === 'getById' || operation === 'deleteById') {
						const watchlistId = String(this.getNodeParameter('endUserWatchlistId', i, '')).trim();
						if (!watchlistId) {
							throw new NodeOperationError(this.getNode(), 'Watchlist ID is required', {
								itemIndex: i,
							});
						}
						method = operation === 'getById' ? 'GET' : 'DELETE';
						url = `${baseUrl}/enduserwatchlist/${encodeURIComponent(watchlistId)}`;
					} else {
						throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, {
							itemIndex: i,
						});
					}

					const response = await this.helpers.httpRequestWithAuthentication.call(this, 'hackNoticeApi', {
						method,
						url,
						headers,
						body,
						json: !(body instanceof URLSearchParams),
					});

					let parsedResponse = response as unknown;
					if (typeof response === 'string') {
						try {
							parsedResponse = JSON.parse(response) as unknown;
						} catch {
							parsedResponse = { value: response };
						}
					}

					const watchlistItems = extractItems(parsedResponse).map((item) =>
						item && typeof item === 'object' ? (item as IDataObject) : ({ value: item } as IDataObject),
					);
					const jsonArray = this.helpers.returnJsonArray(watchlistItems) as INodeExecutionData[];
					for (const data of jsonArray) {
						data.pairedItem = { item: i };
						returnData.push(data);
					}
					continue;
				}

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
