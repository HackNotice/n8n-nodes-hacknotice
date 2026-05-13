import type { INodeProperties } from 'n8n-workflow';

const showOnlyForFirstPartyWatchlist = {
	resource: ['firstPartyWatchlist'],
};

export const firstPartyWatchlistDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForFirstPartyWatchlist,
		},
		options: [
			{
				name: 'Create Item',
				value: 'createItem',
				action: 'Create item',
				description: 'Add a domain to the first-party watchlist',
			},
			{
				name: 'Delete By ID',
				value: 'deleteById',
				action: 'Delete by ID',
				description: 'Delete a first-party watchlist item by document ID',
			},
			{
				name: 'Get By ID',
				value: 'getById',
				action: 'Get by ID',
				description: 'Get a first-party watchlist item by document ID',
			},
			{
				name: 'Get Watchlist Items',
				value: 'getWatchlistItems',
				action: 'Get watchlist items',
				description: 'Read a page of first-party watchlist domains',
			},
			{
				name: 'Search Item',
				value: 'searchItem',
				action: 'Search item',
				description: 'Search the first-party watchlist for a domain',
			},
		],
		default: 'getWatchlistItems',
	},
	{
		displayName: 'Page Number',
		name: 'firstPartyWatchlistPage',
		type: 'number',
		default: 0,
		typeOptions: {
			minValue: 0,
		},
		description: 'Zero-based page index for the watchlist items endpoint',
		displayOptions: {
			show: {
				resource: ['firstPartyWatchlist'],
				operation: ['getWatchlistItems'],
			},
		},
	},
	{
		displayName: 'Request Body',
		name: 'firstPartyWatchlistRequestBody',
		type: 'json',
		default: '{ "sort": "count" }',
		description: 'JSON body sent to the watchlist items endpoint',
		displayOptions: {
			show: {
				resource: ['firstPartyWatchlist'],
				operation: ['getWatchlistItems'],
			},
		},
	},
	{
		displayName: 'Watchlist ID',
		name: 'firstPartyWatchlistId',
		type: 'string',
		default: '',
		required: true,
		description: 'First-party watchlist document ID',
		displayOptions: {
			show: {
				resource: ['firstPartyWatchlist'],
				operation: ['deleteById', 'getById'],
			},
		},
	},
	{
		displayName: 'Domain',
		name: 'firstPartyWatchlistDomain',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'example.com',
		description: 'Domain to create or search in the first-party watchlist',
		displayOptions: {
			show: {
				resource: ['firstPartyWatchlist'],
				operation: ['createItem', 'searchItem'],
			},
		},
	},
	{
		displayName: 'Search Options',
		name: 'firstPartyWatchlistSearchOptions',
		type: 'json',
		default: '{}',
		description: 'Optional extra JSON fields sent with Search Item, such as `fromDate`, `toDate`, or `hoveredDate`',
		displayOptions: {
			show: {
				resource: ['firstPartyWatchlist'],
				operation: ['searchItem'],
			},
		},
	},
];
