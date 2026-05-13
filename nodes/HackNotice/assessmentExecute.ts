/**
 * Execute branch for HackNotice extension API “Assessments” routes.
 */

import {
	type IDataObject,
	type IExecuteFunctions,
	type IHttpRequestOptions,
	type INodeExecutionData,
	type JsonObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	buildAssessmentPath,
	lookupAssessmentRoute,
	type AssessmentBodyKind,
	type AssessmentResourceKey,
} from './assessmentRegistry';

/** Parse JSON parameter (object from UI or string). */
function parseJsonBodyParameter(raw: unknown): Record<string, unknown> {
	if (raw === undefined || raw === null) return {};
	if (typeof raw === 'object' && !Array.isArray(raw)) {
		return raw as Record<string, unknown>;
	}
	if (typeof raw === 'string') {
		const trimmed = raw.trim();
		if (!trimmed) return {};
		try {
			const parsed = JSON.parse(trimmed) as unknown;
			if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
				return parsed as Record<string, unknown>;
			}
		} catch {
			return {};
		}
	}
	return {};
}

function isEmptyBody(obj: Record<string, unknown>): boolean {
	return Object.keys(obj).length === 0;
}

function resolveBody(
	kind: AssessmentBodyKind,
	parsed: Record<string, unknown>,
	itemIndex: number,
	ctx: IExecuteFunctions,
): Record<string, unknown> | undefined {
	const node = ctx.getNode();
	if (kind === 'none' || kind === 'multipartUpload') return undefined;
	if (kind === 'optionalJson') {
		return isEmptyBody(parsed) ? {} : parsed;
	}
	if (kind === 'requiredJson') {
		if (isEmptyBody(parsed)) {
			throw new NodeOperationError(
				node,
				'Request body is required for this operation. Provide JSON in Request Body.',
				{ itemIndex },
			);
		}
		return parsed;
	}
	return undefined;
}

function normalizeToDataObjects(response: unknown): IDataObject[] {
	if (Array.isArray(response)) return response as IDataObject[];
	if (response === null || response === undefined) return [];
	if (typeof response === 'object') return [response as IDataObject];
	return [{ value: response } as IDataObject];
}

function extractFilenameFromDisposition(header: string | undefined): string | undefined {
	if (!header) return undefined;
	const match = /filename\*?=(?:UTF-8'')?("?)([^";\n]+)\1/i.exec(header);
	return match?.[2]?.trim();
}

function headerValue(
	headers: Record<string, string | string[] | undefined> | undefined,
	name: string,
): string | undefined {
	if (!headers) return undefined;
	const want = name.toLowerCase();
	for (const [key, val] of Object.entries(headers)) {
		if (key.toLowerCase() === want) {
			return Array.isArray(val) ? val[0] : val;
		}
	}
	return undefined;
}

/**
 * Runs a single input item against the selected assessment-area operation.
 */
export async function executeHackNoticeAssessmentItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
	baseUrl: string,
	resource: AssessmentResourceKey,
	operation: string,
): Promise<INodeExecutionData[]> {
	const route = lookupAssessmentRoute(resource, operation);
	if (!route) {
		throw new NodeOperationError(
			ctx.getNode(),
			`Unknown operation "${operation}" for resource "${resource}"`,
			{ itemIndex },
		);
	}

	const node = ctx.getNode();

	try {
		const pageNum = Number(ctx.getNodeParameter('assessmentPageNum', itemIndex, 0));
		const docId = String(ctx.getNodeParameter('assessmentDocumentId', itemIndex, '') ?? '').trim();
		const inviteCode = String(ctx.getNodeParameter('assessmentInviteCode', itemIndex, '') ?? '').trim();

		if (route.path.includes(':pageNum') && (!Number.isFinite(pageNum) || pageNum < 0)) {
			throw new NodeOperationError(node, 'Page number must be a non‑negative integer.', { itemIndex });
		}

		if (route.path.includes(':docId') && !docId) {
			throw new NodeOperationError(node, 'Document ID is required for this operation.', { itemIndex });
		}

		if (route.path.includes(':inviteCode') && !inviteCode) {
			throw new NodeOperationError(node, 'Invite code is required for this operation.', { itemIndex });
		}

		const parsedBody = parseJsonBodyParameter(ctx.getNodeParameter('assessmentRequestBody', itemIndex, {}));
		let bodyPayload: Record<string, unknown> | undefined = resolveBody(route.body, parsedBody, itemIndex, ctx);

		const pathBuilt = buildAssessmentPath(route.path, {
			pageNum,
			docId,
			inviteCode,
		});
		const url = `${baseUrl.replace(/\/+$/, '')}${pathBuilt}`;

		if (route.body === 'multipartUpload') {
			const assessmentId = String(
				ctx.getNodeParameter('assessmentUploadAssessmentId', itemIndex, '') ?? '',
			).trim();
			if (!assessmentId) {
				throw new NodeOperationError(node, 'Upload Assessment ID is required.', { itemIndex });
			}
			const binaryProperty = String(
				ctx.getNodeParameter('assessmentUploadBinaryProperty', itemIndex, 'data') ?? 'data',
			).trim();
			if (!binaryProperty) {
				throw new NodeOperationError(node, 'Input Binary Field is required.', { itemIndex });
			}

			const binaryMeta = ctx.helpers.assertBinaryData(itemIndex, binaryProperty);
			const buffer = await ctx.helpers.getBinaryDataBuffer(itemIndex, binaryProperty);
			const mime = binaryMeta.mimeType || 'application/octet-stream';
			const fileName =
				binaryMeta.fileName ??
				(typeof binaryMeta.fileExtension === 'string' && binaryMeta.fileExtension
					? `upload.${binaryMeta.fileExtension}`
					: 'upload.bin');

			const optionalFilename = String(ctx.getNodeParameter('assessmentUploadFilename', itemIndex, '') ?? '').trim();
			const optionalNote = String(ctx.getNodeParameter('assessmentUploadNote', itemIndex, '') ?? '').trim();

			const fd = new FormData();
			fd.append('assessment_id', assessmentId);
			fd.append('data', new Blob([buffer], { type: mime }), fileName);
			if (optionalFilename) fd.append('filename', optionalFilename);
			if (optionalNote) fd.append('note', optionalNote);

			const formRequest: IHttpRequestOptions = {
				method: route.method,
				url,
				body: fd,
				json: false,
			};

			const res = await ctx.helpers.httpRequestWithAuthentication.call(ctx, 'hackNoticeApi', formRequest);
			const normalized = normalizeToDataObjects(res);
			const items = ctx.helpers.returnJsonArray(normalized) as INodeExecutionData[];
			return items.map((row) => ({ ...row, pairedItem: { item: itemIndex } }));
		}

		if (route.binaryDownload === true) {
			const full = (await ctx.helpers.httpRequestWithAuthentication.call(
				ctx,
				'hackNoticeApi',
				{
					method: route.method,
					url,
					encoding: 'arraybuffer',
					json: false,
					returnFullResponse: true,
				} as IHttpRequestOptions,
			)) as { body?: ArrayBuffer | Buffer; headers?: Record<string, string> };

			const rawBody = full.body;
			if (!rawBody) {
				throw new NodeOperationError(node, 'Empty response body when downloading file.', { itemIndex });
			}
			const buf = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(new Uint8Array(rawBody as ArrayBuffer));

			const disposition = headerValue(full.headers, 'content-disposition');
			const hintedName = extractFilenameFromDisposition(disposition) ?? `assessment-file-${docId || 'download'}`;
			const mime = headerValue(full.headers, 'content-type') ?? 'application/octet-stream';

			const binaryBody = await ctx.helpers.prepareBinaryData(buf, hintedName, mime);
			return [
				{
					json: {
						fileName: hintedName,
						mimeType: mime,
						documentId: docId || undefined,
					},
					binary: { data: binaryBody },
					pairedItem: { item: itemIndex },
				},
			];
		}

		if (route.method === 'GET' || route.method === 'DELETE') {
			bodyPayload = undefined;
		}

		const options: IHttpRequestOptions = {
			method: route.method,
			url,
			json: true,
		};

		if (bodyPayload !== undefined && route.method !== 'GET' && route.method !== 'DELETE') {
			options.body = bodyPayload;
		}

		const res = await ctx.helpers.httpRequestWithAuthentication.call(ctx, 'hackNoticeApi', options);
		const normalized = normalizeToDataObjects(res);
		const items = ctx.helpers.returnJsonArray(normalized) as INodeExecutionData[];
		return items.map((row) => ({ ...row, pairedItem: { item: itemIndex } }));
	} catch (error) {
		if (error instanceof NodeOperationError) {
			throw error;
		}
		throw new NodeApiError(node, error as JsonObject, { itemIndex });
	}
}
