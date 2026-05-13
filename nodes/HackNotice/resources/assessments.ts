/**
 * Assessments-area resources for the HackNotice node (extensions API).
 * Operations mirror the Postman "Assessments" folder.
 */

import type { INodeProperties } from 'n8n-workflow';

import {
	ASSESSMENT_ROUTE_TABLE,
	type AssessmentResourceKey,
	HACKNOTICE_ASSESSMENT_RESOURCE_KEYS,
} from '../assessmentRegistry';

function operationOptionsFor(resource: AssessmentResourceKey) {
	const table = ASSESSMENT_ROUTE_TABLE[resource];
	return Object.values(table).map((def) => ({
		name: def.displayName,
		value: def.operationValue,
		action: def.displayName,
		description: `${def.method} ${def.path}`,
	}));
}

const invitedUploadMultipart = {
	resource: ['invitedAssessmentDataFile'] as AssessmentResourceKey[],
	operation: ['uploadInvitedFile'],
};

const allAssessmentResources = { resource: [...HACKNOTICE_ASSESSMENT_RESOURCE_KEYS] };

export const assessmentsResourceDescription: INodeProperties[] = [
	...HACKNOTICE_ASSESSMENT_RESOURCE_KEYS.map((key): INodeProperties => {
		const firstOp = Object.keys(ASSESSMENT_ROUTE_TABLE[key])[0] ?? '';
		return {
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: {
				show: { resource: [key] },
			},
			options: operationOptionsFor(key),
			default: firstOp,
		};
	}),
	{
		displayName: 'Document ID',
		name: 'assessmentDocumentId',
		type: 'string',
		default: '',
		description:
			'Mongo-style document ID used in URL path for this call (assessments, invites, templates, events, data files)',
		displayOptions: {
			show: allAssessmentResources,
		},
	},
	{
		displayName: 'Page Number',
		name: 'assessmentPageNum',
		type: 'number',
		default: 0,
		typeOptions: { minValue: 0 },
		description: 'Zero-based page index for paginated endpoints (page size fixed at 50 on the API)',
		displayOptions: {
			show: allAssessmentResources,
		},
	},
	{
		displayName: 'Invite Code',
		name: 'assessmentInviteCode',
		type: 'string',
		default: '',
		description: 'Invite code segment for `/assessmentinvites/code/` and `/activate/` routes',
		displayOptions: {
			show: allAssessmentResources,
		},
	},
	{
		displayName: 'Request Body',
		name: 'assessmentRequestBody',
		type: 'json',
		default: '{}',
		description:
			'JSON body for POST and PUT endpoints. Use {} when not needed; unrelated fields are ignored at runtime.',
		displayOptions: {
			show: allAssessmentResources,
		},
	},
	{
		displayName: 'Upload Assessment ID',
		name: 'assessmentUploadAssessmentId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: invitedUploadMultipart,
		},
		description: 'Assessment ID appended as multipart field `assessment_id` when uploading',
	},
	{
		displayName: 'Upload Filename',
		name: 'assessmentUploadFilename',
		type: 'string',
		default: '',
		displayOptions: {
			show: invitedUploadMultipart,
		},
		description: 'Optional `filename` form field forwarded with the multipart upload',
	},
	{
		displayName: 'Upload Note',
		name: 'assessmentUploadNote',
		type: 'string',
		default: '',
		displayOptions: {
			show: invitedUploadMultipart,
		},
		description: 'Optional `note` form field forwarded with the multipart upload',
	},
	{
		displayName: 'Input Binary Field',
		name: 'assessmentUploadBinaryProperty',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: invitedUploadMultipart,
		},
		description:
			'Name of the input item binary field (`data`) sent as multipart field `data`; required for **Upload File (Invited)**',
		hint: 'Provide an item with a binary before this node (Drive, HTTP Request, Read Binary File…).',
	},
];
