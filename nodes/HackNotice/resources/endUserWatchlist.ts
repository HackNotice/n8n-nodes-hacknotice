import type { INodeProperties } from 'n8n-workflow';

const showOnlyForEndUserWatchlist = {
	resource: ['endUserWatchlist'],
};

export const endUserWatchlistDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForEndUserWatchlist,
		},
		options: [
			{
				name: 'Add Item to Watchlist',
				value: 'addItemToWatchlist',
				action: 'Add item to watchlist',
				description: 'Add an email or hash to the end user watchlist',
			},
			{
				name: 'Delete By ID',
				value: 'deleteById',
				action: 'Delete by ID',
				description: 'Delete an end user watchlist item by document ID',
			},
			{
				name: 'Get By ID',
				value: 'getById',
				action: 'Get by ID',
				description: 'Get an end user watchlist item by document ID',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many',
				description: 'Read a page of end user watchlist items',
			},
			{
				name: 'Search for Email',
				value: 'searchForEmail',
				action: 'Search for email',
				description: 'Search the end user watchlist for an email address or hash',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Page Number',
		name: 'endUserWatchlistPage',
		type: 'number',
		default: 0,
		typeOptions: {
			minValue: 0,
		},
		description: 'Zero-based page index for the end user watchlist endpoint',
		displayOptions: {
			show: {
				resource: ['endUserWatchlist'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Watchlist ID',
		name: 'endUserWatchlistId',
		type: 'string',
		default: '',
		required: true,
		description: 'End user watchlist document ID',
		displayOptions: {
			show: {
				resource: ['endUserWatchlist'],
				operation: ['deleteById', 'getById'],
			},
		},
	},
	{
		displayName: 'Email or Hash',
		name: 'endUserWatchlistEmail',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'person@example.com',
		description: 'Email address or Dark Hash Collision hash to create or search',
		displayOptions: {
			show: {
				resource: ['endUserWatchlist'],
				operation: ['addItemToWatchlist', 'searchForEmail'],
			},
		},
	},
	{
		displayName: 'Tags',
		name: 'endUserWatchlistTags',
		type: 'json',
		default: '[]',
		description: 'Optional tags array sent when adding the item',
		displayOptions: {
			show: {
				resource: ['endUserWatchlist'],
				operation: ['addItemToWatchlist'],
			},
		},
	},
	{
		displayName: 'Hashed',
		name: 'endUserWatchlistHashed',
		type: 'boolean',
		default: false,
		description: 'Whether the Email or Hash value is already hashed',
		displayOptions: {
			show: {
				resource: ['endUserWatchlist'],
				operation: ['addItemToWatchlist'],
			},
		},
	},
];
