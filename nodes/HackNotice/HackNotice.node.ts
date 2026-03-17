import {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { thirdPartyAlertsDescription } from './resources/thirdPartyAlerts';
import { firstPartyAlertsDescription } from './resources/firstPartyAlerts';
import { researchDescription } from './resources/research';
import { endUserAlertsDescription } from './resources/endUserAlerts';

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
		requestDefaults: {
			baseURL: "={{ ($credentials.baseUrl || 'https://api.hacknotice.com').replace(/\\/$/, '') }}",
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
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
				const credentials = (await this.getCredentials('hackNoticeApi')) as {
					baseUrl?: string;
				} | null;

				const baseUrl = ((credentials?.baseUrl as string) || 'https://api.hacknotice.com').replace(
					/\/$/,
					'',
				);

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'hackNoticeApi',
					{
						method: 'GET',
						url: `${baseUrl}/hackalertsavedsearch/page/0`,
						json: true,
					},
				)) as Array<{ _id?: string; name?: string; search?: unknown }>;
				const empty = [{ name: '', value: '' }];
				if (!Array.isArray(response)) {
					return empty;
				}
				return empty.concat(
					response
						.filter((item) => item && item.search)
						.map((item) => ({
							name: item.name ?? '',
							// Store the full `search` object as a JSON string so it can be used directly as request body.
							value: JSON.stringify(item.search ?? {}),
						})),
				);
			},

			async getFirstPartySavedSearches(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const credentials = (await this.getCredentials('hackNoticeApi')) as {
					baseUrl?: string;
				} | null;

				const baseUrl = ((credentials?.baseUrl as string) || 'https://api.hacknotice.com').replace(
					/\/$/,
					'',
				);

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'hackNoticeApi',
					{
						method: 'GET',
						url: `${baseUrl}/domainalertsavedsearch/page/0`,
						json: true,
					},
				)) as Array<{ _id?: string; name?: string; search?: unknown }>;
				const empty = [{ name: '', value: '' }];
				if (!Array.isArray(response)) {
					return empty;
				}
				return empty.concat(
					response
						.filter((item) => item && item.search)
						.map((item) => ({
							name: item.name ?? '',
							value: JSON.stringify(item.search ?? {}),
						})),
				);
			},

			async getEndUserSavedSearches(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const credentials = (await this.getCredentials('hackNoticeApi')) as {
					baseUrl?: string;
				} | null;

				const baseUrl = ((credentials?.baseUrl as string) || 'https://api.hacknotice.com').replace(
					/\/$/,
					'',
				);

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'hackNoticeApi',
					{
						method: 'GET',
						url: `${baseUrl}/endusersavedsearch/page/0`,
						json: true,
					},
				)) as Array<{ _id?: string; name?: string; search?: unknown }>;
				const empty = [{ name: '', value: '' }];
				if (!Array.isArray(response)) {
					return empty;
				}
				return empty.concat(
					response
						.filter((item) => item && item.search)
						.map((item) => ({
							name: item.name ?? '',
							value: JSON.stringify(item.search ?? {}),
						})),
				);
			},

			async getResearchSavedSearches(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const credentials = (await this.getCredentials('hackNoticeApi')) as {
					baseUrl?: string;
				} | null;

				const baseUrl = ((credentials?.baseUrl as string) || 'https://api.hacknotice.com').replace(
					/\/$/,
					'',
				);

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'hackNoticeApi',
					{
						method: 'GET',
						url: `${baseUrl}/researchsavedsearch/page/0`,
						json: true,
					},
				)) as Array<{ _id?: string; name?: string; search?: string | unknown }>;
				const empty = [{ name: '', value: '' }];
				if (!Array.isArray(response)) {
					return empty;
				}
				const prefix = '__research__::';
				return empty.concat(
					response
						.filter((item) => item && item.search != null)
						.map((item) => {
							const id = item._id ?? '';
							const searchStr =
								typeof item.search === 'string'
									? item.search
									: JSON.stringify(item.search ?? {});
							return {
								name: item.name ?? '',
								value: `${prefix}${id}::${searchStr}`,
							};
						}),
				);
			},

			// async getTiers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
			// 	const credentials = (await this.getCredentials('hackNoticeApi')) as {
			// 		baseUrl?: string;
			// 	} | null;

			// 	const baseUrl = ((credentials?.baseUrl as string) || 'https://api.hacknotice.com').replace(
			// 		/\/$/,
			// 		'',
			// 	);

			// 	const response = (await this.helpers.httpRequestWithAuthentication.call(
			// 		this,
			// 		'hackNoticeApi',
			// 		{
			// 			method: 'POST',
			// 			url: `${baseUrl}/tiers/page/0`,
			// 			body: {},
			// 			json: true,
			// 		},
			// 	)) as Array<{ _id?: string; tier: string; alert_collection_name?: string }>;

			// 	if (!Array.isArray(response)) {
			// 		return [{ name: 'No Tier', value: '' }];
			// 	}

			// 	const hackalertTiers = response
			// 		.filter((item) => item && item.alert_collection_name === 'hackalert')
			// 		.map((item) => ({
			// 			name: item.tier,
			// 			value: item.tier,
			// 		}));

			// 	return [{ name: 'No Tier', value: '' }, ...hackalertTiers];
			// },
		},
	};
}
