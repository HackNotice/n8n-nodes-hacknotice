/**
 * HackNotice assessments API route registry
 *
 * Mirrors the Postman folder "Assessments" (extension API):
 * assessments, assessmentevents, assessmenttemplates, assessmentpreferences,
 * assessmentinvites, customer assessment data files, invited assessment data files.
 * Used by HackNotice.node execute + property display options.
 */

import type { IHttpRequestMethods } from 'n8n-workflow';

export type AssessmentBodyKind = 'none' | 'optionalJson' | 'requiredJson' | 'multipartUpload';

export type AssessmentRouteDef = {
	/** Stable internal operation key shown in workflow JSON */
	operationValue: string;
	/** Labels for the HackNotice node's operation dropdown */
	displayName: string;
	method: IHttpRequestMethods;
	/** Absolute path segment after `/` base, with placeholders :pageNum, :docId, :inviteCode */
	path: string;
	body: AssessmentBodyKind;
	/** Attach raw download as execution binary instead of parsing JSON */
	binaryDownload?: boolean;
};

export type AssessmentResourceKey =
	| 'assessment'
	| 'assessmentEvent'
	| 'assessmentTemplate'
	| 'assessmentPreference'
	| 'assessmentInvite'
	| 'assessmentDataFile'
	| 'invitedAssessmentDataFile';

export const HACKNOTICE_ASSESSMENT_RESOURCE_KEYS: AssessmentResourceKey[] = [
	'assessment',
	'assessmentEvent',
	'assessmentTemplate',
	'assessmentPreference',
	'assessmentInvite',
	'assessmentDataFile',
	'invitedAssessmentDataFile',
];

export const HACKNOTICE_ASSESSMENT_RESOURCES_SET = new Set<string>(HACKNOTICE_ASSESSMENT_RESOURCE_KEYS);

/** Route table keyed by `[resource][operationValue]`. */
export const ASSESSMENT_ROUTE_TABLE: Record<AssessmentResourceKey, Record<string, AssessmentRouteDef>> = {
	assessment: Object.fromEntries(
		[
			{
				operationValue: 'getAssessmentInvite',
				displayName: 'Get Assessment Invite',
				method: 'GET',
				path: '/assessments/invited/:docId',
				body: 'none',
			},
			{
				operationValue: 'updateAssessmentInvite',
				displayName: 'Update Assessment Invite',
				method: 'PUT',
				path: '/assessments/invited/:docId',
				body: 'requiredJson',
			},
			{
				operationValue: 'listAssessmentsPage',
				displayName: 'List Assessments (Page)',
				method: 'POST',
				path: '/assessments/page/:pageNum',
				body: 'optionalJson',
			},
			{
				operationValue: 'countAssessments',
				displayName: 'Count Assessments',
				method: 'POST',
				path: '/assessments/count',
				body: 'optionalJson',
			},
			{
				operationValue: 'createAssessment',
				displayName: 'Create Assessment',
				method: 'POST',
				path: '/assessments',
				body: 'requiredJson',
			},
			{
				operationValue: 'getAssessment',
				displayName: 'Get Assessment',
				method: 'GET',
				path: '/assessments/:docId',
				body: 'none',
			},
			{
				operationValue: 'projectionAssessments',
				displayName: 'Projection Assessments',
				method: 'POST',
				path: '/assessments/projection',
				body: 'optionalJson',
			},
			{
				operationValue: 'deleteAssessment',
				displayName: 'Delete Assessment',
				method: 'DELETE',
				path: '/assessments/:docId',
				body: 'none',
			},
			{
				operationValue: 'updateAssessment',
				displayName: 'Update Assessment',
				method: 'PUT',
				path: '/assessments/:docId',
				body: 'requiredJson',
			},
		].map((d) => [d.operationValue, d]),
	) as Record<string, AssessmentRouteDef>,

	assessmentEvent: Object.fromEntries(
		[
			{
				operationValue: 'invitedListEventsPage',
				displayName: 'Invited — List Events (Page)',
				method: 'POST',
				path: '/assessmentevents/invited/page/:pageNum',
				body: 'requiredJson',
			},
			{
				operationValue: 'invitedCreateEvent',
				displayName: 'Invited — Create Event',
				method: 'POST',
				path: '/assessmentevents/invited',
				body: 'requiredJson',
			},
			{
				operationValue: 'invitedGetEvent',
				displayName: 'Invited — Get Event',
				method: 'GET',
				path: '/assessmentevents/invited/:docId',
				body: 'none',
			},
			{
				operationValue: 'invitedDeleteEvent',
				displayName: 'Invited — Delete Event',
				method: 'DELETE',
				path: '/assessmentevents/invited/:docId',
				body: 'none',
			},
			{
				operationValue: 'invitedUpdateEvent',
				displayName: 'Invited — Update Event',
				method: 'PUT',
				path: '/assessmentevents/invited/:docId',
				body: 'requiredJson',
			},
			{
				operationValue: 'listEventsPage',
				displayName: 'List Events (Page)',
				method: 'POST',
				path: '/assessmentevents/page/:pageNum',
				body: 'optionalJson',
			},
			{
				operationValue: 'countEvents',
				displayName: 'Count Events',
				method: 'POST',
				path: '/assessmentevents/count',
				body: 'optionalJson',
			},
			{
				operationValue: 'createEvent',
				displayName: 'Create Event',
				method: 'POST',
				path: '/assessmentevents',
				body: 'requiredJson',
			},
			{
				operationValue: 'getEvent',
				displayName: 'Get Event',
				method: 'GET',
				path: '/assessmentevents/:docId',
				body: 'none',
			},
			{
				operationValue: 'deleteEvent',
				displayName: 'Delete Event',
				method: 'DELETE',
				path: '/assessmentevents/:docId',
				body: 'none',
			},
			{
				operationValue: 'updateEvent',
				displayName: 'Update Event',
				method: 'PUT',
				path: '/assessmentevents/:docId',
				body: 'requiredJson',
			},
		].map((d) => [d.operationValue, d]),
	) as Record<string, AssessmentRouteDef>,

	assessmentTemplate: Object.fromEntries(
		[
			{
				operationValue: 'listTemplatesPage',
				displayName: 'List Templates (Page)',
				method: 'POST',
				path: '/assessmenttemplates/page/:pageNum',
				body: 'optionalJson',
			},
			{
				operationValue: 'listTemplateFrameworks',
				displayName: 'List Template Frameworks',
				method: 'GET',
				path: '/assessmenttemplates/frameworks',
				body: 'none',
			},
			{
				operationValue: 'countTemplates',
				displayName: 'Count Templates',
				method: 'POST',
				path: '/assessmenttemplates/count',
				body: 'optionalJson',
			},
			{
				operationValue: 'createTemplate',
				displayName: 'Create Template',
				method: 'POST',
				path: '/assessmenttemplates',
				body: 'requiredJson',
			},
			{
				operationValue: 'getTemplate',
				displayName: 'Get Template',
				method: 'GET',
				path: '/assessmenttemplates/:docId',
				body: 'none',
			},
			{
				operationValue: 'deleteTemplate',
				displayName: 'Delete Template',
				method: 'DELETE',
				path: '/assessmenttemplates/:docId',
				body: 'none',
			},
			{
				operationValue: 'updateTemplate',
				displayName: 'Update Template',
				method: 'PUT',
				path: '/assessmenttemplates/:docId',
				body: 'requiredJson',
			},
		].map((d) => [d.operationValue, d]),
	) as Record<string, AssessmentRouteDef>,

	assessmentPreference: Object.fromEntries(
		[
			{
				operationValue: 'createPreferences',
				displayName: 'Create Preferences',
				method: 'POST',
				path: '/assessmentpreferences',
				body: 'requiredJson',
			},
			{
				operationValue: 'getPreferences',
				displayName: 'Get Preferences',
				method: 'GET',
				path: '/assessmentpreferences',
				body: 'none',
			},
			{
				operationValue: 'deletePreferences',
				displayName: 'Delete Preferences',
				method: 'DELETE',
				path: '/assessmentpreferences',
				body: 'none',
			},
			{
				operationValue: 'updatePreferences',
				displayName: 'Update Preferences',
				method: 'PUT',
				path: '/assessmentpreferences',
				body: 'requiredJson',
			},
		].map((d) => [d.operationValue, d]),
	) as Record<string, AssessmentRouteDef>,

	assessmentInvite: Object.fromEntries(
		[
			{
				operationValue: 'listInvitesPage',
				displayName: 'List Invites (Page)',
				method: 'POST',
				path: '/assessmentinvites/page/:pageNum',
				body: 'optionalJson',
			},
			{
				operationValue: 'countInvites',
				displayName: 'Count Invites',
				method: 'POST',
				path: '/assessmentinvites/count',
				body: 'optionalJson',
			},
			{
				operationValue: 'createInvite',
				displayName: 'Create Invite',
				method: 'POST',
				path: '/assessmentinvites',
				body: 'requiredJson',
			},
			{
				operationValue: 'getInvite',
				displayName: 'Get Invite',
				method: 'GET',
				path: '/assessmentinvites/:docId',
				body: 'none',
			},
			{
				operationValue: 'listMyInvites',
				displayName: 'List My Invites',
				method: 'GET',
				path: '/assessmentinvites/mine',
				body: 'none',
			},
			{
				operationValue: 'getInviteByCode',
				displayName: 'Get Invite by Code',
				method: 'GET',
				path: '/assessmentinvites/code/:inviteCode',
				body: 'none',
			},
			{
				operationValue: 'activateInvite',
				displayName: 'Activate Invite',
				method: 'POST',
				path: '/assessmentinvites/activate/:inviteCode',
				body: 'none',
			},
			{
				operationValue: 'deleteInvite',
				displayName: 'Delete Invite',
				method: 'DELETE',
				path: '/assessmentinvites/:docId',
				body: 'none',
			},
			{
				operationValue: 'updateInvite',
				displayName: 'Update Invite',
				method: 'PUT',
				path: '/assessmentinvites/:docId',
				body: 'requiredJson',
			},
		].map((d) => [d.operationValue, d]),
	) as Record<string, AssessmentRouteDef>,

	assessmentDataFile: Object.fromEntries(
		[
			{
				operationValue: 'listFilesPage',
				displayName: 'List Files (Page)',
				method: 'POST',
				path: '/assessmentdatafiles/page/:pageNum',
				body: 'optionalJson',
			},
			{
				operationValue: 'countFiles',
				displayName: 'Count Files',
				method: 'POST',
				path: '/assessmentdatafiles/count',
				body: 'optionalJson',
			},
			{
				operationValue: 'getFile',
				displayName: 'Get File Metadata',
				method: 'GET',
				path: '/assessmentdatafiles/:docId',
				body: 'none',
			},
			{
				operationValue: 'updateFile',
				displayName: 'Update File Metadata',
				method: 'PUT',
				path: '/assessmentdatafiles/:docId',
				body: 'requiredJson',
			},
			{
				operationValue: 'downloadFile',
				displayName: 'Download File',
				method: 'GET',
				path: '/assessmentdatafiles/download/:docId',
				body: 'none',
				binaryDownload: true,
			},
			{
				operationValue: 'deleteFile',
				displayName: 'Delete File',
				method: 'DELETE',
				path: '/assessmentdatafiles/:docId',
				body: 'none',
			},
		].map((d) => [d.operationValue, d]),
	) as Record<string, AssessmentRouteDef>,

	invitedAssessmentDataFile: Object.fromEntries(
		[
			{
				operationValue: 'uploadInvitedFile',
				displayName: 'Upload File (Invited)',
				method: 'POST',
				path: '/assessmentdatafiles/invited',
				body: 'multipartUpload',
			},
			{
				operationValue: 'listInvitedFilesPage',
				displayName: 'List Files (Page, Invited)',
				method: 'POST',
				path: '/assessmentdatafiles/invited/page/:pageNum',
				body: 'requiredJson',
			},
			{
				operationValue: 'countInvitedFiles',
				displayName: 'Count Files (Invited)',
				method: 'POST',
				path: '/assessmentdatafiles/invited/count',
				body: 'requiredJson',
			},
			{
				operationValue: 'getInvitedFile',
				displayName: 'Get File Metadata (Invited)',
				method: 'GET',
				path: '/assessmentdatafiles/invited/:docId',
				body: 'none',
			},
			{
				operationValue: 'downloadInvitedFile',
				displayName: 'Download File (Invited)',
				method: 'GET',
				path: '/assessmentdatafiles/invited/download/:docId',
				body: 'none',
				binaryDownload: true,
			},
			{
				operationValue: 'deleteInvitedFile',
				displayName: 'Delete File (Invited)',
				method: 'DELETE',
				path: '/assessmentdatafiles/invited/:docId',
				body: 'none',
			},
		].map((d) => [d.operationValue, d]),
	) as Record<string, AssessmentRouteDef>,
};

export function lookupAssessmentRoute(
	resource: AssessmentResourceKey,
	operationValue: string,
): AssessmentRouteDef | undefined {
	return ASSESSMENT_ROUTE_TABLE[resource]?.[operationValue];
}

/** Build URL path with encoded segment substitution. */
export function buildAssessmentPath(
	template: string,
	params: { pageNum?: number; docId?: string; inviteCode?: string },
): string {
	let path = template;
	if (path.includes(':pageNum')) {
		const n = params.pageNum ?? 0;
		path = path.replace(':pageNum', String(Number.isFinite(n) ? Math.floor(n) : 0));
	}
	if (path.includes(':docId')) {
		path = path.replace(':docId', encodeURIComponent(String(params.docId ?? '').trim()));
	}
	if (path.includes(':inviteCode')) {
		path = path.replace(':inviteCode', encodeURIComponent(String(params.inviteCode ?? '').trim()));
	}
	return path;
}
