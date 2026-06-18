import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IDataObject,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

const API_BASE = 'https://api.pdfpipe.xyz';

function extractApiError(err: unknown): string {
  const e = err as Record<string, Record<string, unknown>> | null;
  try {
    const data = e?.response?.data;
    if (data && typeof data === 'object' && 'detail' in data) return String((data as Record<string, unknown>).detail);
    if (typeof data === 'string') {
      const parsed = JSON.parse(data) as Record<string, unknown>;
      if (parsed?.detail) return String(parsed.detail);
    }
  } catch {}
  return (err instanceof Error ? err.message : String(err)) || 'Request failed.';
}

const formatOptions = [
  { name: 'A4', value: 'A4' },
  { name: 'Letter', value: 'Letter' },
  { name: 'A3', value: 'A3' },
  { name: 'A5', value: 'A5' },
  { name: 'Legal', value: 'Legal' },
  { name: 'Tabloid', value: 'Tabloid' },
];

const sharedRenderParams = [
  {
    displayName: 'Format',
    name: 'format',
    type: 'options' as const,
    options: formatOptions,
    default: 'A4',
    description: 'Paper size for the output PDF',
  },
  {
    displayName: 'Landscape',
    name: 'landscape',
    type: 'boolean' as const,
    default: false,
    description: 'Whether to render in landscape orientation',
  },
  {
    displayName: 'Print Background',
    name: 'print_background',
    type: 'boolean' as const,
    default: true,
    description: 'Whether to include background graphics and colors',
  },
  {
    displayName: 'Margin',
    name: 'margin',
    type: 'string' as const,
    default: '1cm',
    description: 'Page margin (e.g. "1cm", "10mm", "0.5in")',
  },
  {
    displayName: 'Header HTML',
    name: 'header_html',
    type: 'string' as const,
    typeOptions: { rows: 3 },
    default: '',
    description: 'HTML for a running page header. Use .pageNumber, .totalPages, .date, .title, .url class names for dynamic substitution.',
  },
  {
    displayName: 'Footer HTML',
    name: 'footer_html',
    type: 'string' as const,
    typeOptions: { rows: 3 },
    default: '',
    description: 'HTML for a running page footer. Same class substitution as Header HTML.',
  },
  {
    displayName: 'Tabular Numbers',
    name: 'tabular_nums',
    type: 'boolean' as const,
    default: false,
    description: 'Whether to force consistent digit widths (font-variant-numeric: tabular-nums) — fixes column misalignment in tables and invoices',
  },
  {
    displayName: 'Deduplicate Images',
    name: 'deduplicate_images',
    type: 'boolean' as const,
    default: false,
    description: 'Whether to merge identical image XObjects in the output PDF — reduces file size when the same image (e.g. a logo) appears on many pages',
  },
  {
    displayName: 'PDF/A',
    name: 'pdf_a',
    type: 'boolean' as const,
    default: false,
    description: 'Whether to add PDF/A-1b XMP metadata for archival compliance (best-effort)',
  },
  {
    displayName: 'Store Document',
    name: 'store',
    type: 'boolean' as const,
    default: false,
    description: 'Whether to store the PDF for later retrieval',
  },
  {
    displayName: 'Filename',
    name: 'filename',
    type: 'string' as const,
    default: '',
    description: 'Custom filename for the stored document (optional)',
    displayOptions: {
      show: { store: [true] },
    },
  },
  {
    displayName: 'Password',
    name: 'password',
    type: 'string' as const,
    typeOptions: { password: true },
    default: '',
    description: 'Password-protect the PDF (optional)',
  },
];

export class PDFPipe implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'PDFPipe',
    name: 'pdfPipe',
    // eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
    icon: 'file:pdfpipe.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Render HTML or URLs to pixel-perfect PDFs using PDFPipe',
    defaults: { name: 'PDFPipe' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'pdfPipeApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Render HTML',
            value: 'renderHtml',
            description: 'Convert an HTML string to a PDF',
            action: 'Render HTML to PDF',
          },
          {
            name: 'Render URL',
            value: 'renderUrl',
            description: 'Convert a web page URL to a PDF',
            action: 'Render URL to PDF',
          },
          {
            name: 'Batch Render',
            value: 'batchRender',
            description: 'Render multiple HTML or URL items in a single request',
            action: 'Batch render to PDF',
          },
          {
            name: 'Get Document',
            value: 'getDocument',
            description: 'Retrieve a stored PDF document by ID',
            action: 'Get stored document',
          },
          {
            name: 'List Documents',
            value: 'listDocuments',
            description: 'List all stored PDF documents',
            action: 'List stored documents',
          },
          {
            name: 'Check Usage',
            value: 'checkUsage',
            description: 'Check current usage and plan limits',
            action: 'Check usage and plan',
          },
        ],
        default: 'renderHtml',
      },

      // renderHtml
      {
        displayName: 'HTML',
        name: 'html',
        type: 'string',
        typeOptions: { rows: 8 },
        default: '',
        required: true,
        description: 'HTML content to render as a PDF',
        displayOptions: {
          show: { operation: ['renderHtml'] },
        },
      },
      ...sharedRenderParams.map((p) => ({
        ...p,
        displayOptions: {
          show: {
            operation: ['renderHtml'],
            ...(p.displayOptions?.show ?? {}),
          },
        },
      })),

      // renderUrl
      {
        displayName: 'URL',
        name: 'url',
        type: 'string',
        default: '',
        required: true,
        description: 'The full URL of the page to render as a PDF',
        displayOptions: {
          show: { operation: ['renderUrl'] },
        },
      },
      ...sharedRenderParams.map((p) => ({
        ...p,
        displayOptions: {
          show: {
            operation: ['renderUrl'],
            ...(p.displayOptions?.show ?? {}),
          },
        },
      })),

      // batchRender
      {
        displayName: 'Requests',
        name: 'requests',
        type: 'json',
        default: '[]',
        required: true,
        description:
          'Array of render request objects. Each item may have "html" or "url", an optional "filename", and an optional "options" object.',
        displayOptions: {
          show: { operation: ['batchRender'] },
        },
      },
      {
        displayName: 'Global Options',
        name: 'global_options',
        type: 'json',
        default: '{}',
        description: 'Options applied to every item in the batch (merged with per-item options)',
        displayOptions: {
          show: { operation: ['batchRender'] },
        },
      },
      {
        displayName: 'Webhook URL',
        name: 'webhook_url',
        type: 'string',
        default: '',
        description: 'URL to receive the batch result when processing completes (optional)',
        displayOptions: {
          show: { operation: ['batchRender'] },
        },
      },
      {
        displayName: 'Webhook Secret',
        name: 'webhook_secret',
        type: 'string',
        typeOptions: { password: true },
        default: '',
        description: 'Secret used to sign the webhook payload (optional)',
        displayOptions: {
          show: { operation: ['batchRender'] },
        },
      },

      // getDocument
      {
        displayName: 'Document ID',
        name: 'documentId',
        type: 'string',
        default: '',
        required: true,
        description: 'The ID of the stored PDF document to retrieve',
        displayOptions: {
          show: { operation: ['getDocument'] },
        },
      },

      // listDocuments
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 100 },
        default: 20,
        description: 'Maximum number of documents to return (max 100)',
        displayOptions: {
          show: { operation: ['listDocuments'] },
        },
      },
      {
        displayName: 'Before (Cursor)',
        name: 'before',
        type: 'string',
        default: '',
        description: 'ISO 8601 timestamp cursor for pagination — pass the next_before value from the previous response',
        displayOptions: {
          show: { operation: ['listDocuments'] },
        },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const credentials = await this.getCredentials('pdfPipeApi');
    const apiKey = credentials.apiKey as string;

    for (let i = 0; i < items.length; i++) {
      const operation = this.getNodeParameter('operation', i) as string;

      if (operation === 'renderHtml' || operation === 'renderUrl') {
        const inputValue = operation === 'renderHtml'
          ? (this.getNodeParameter('html', i) as string)
          : (this.getNodeParameter('url', i) as string);
        if (!inputValue.trim()) {
          throw new NodeOperationError(
            this.getNode(),
            operation === 'renderHtml' ? 'HTML must not be empty' : 'URL must not be empty',
            { itemIndex: i },
          );
        }

        const options: IDataObject = {
          format: this.getNodeParameter('format', i) as string,
          landscape: this.getNodeParameter('landscape', i) as boolean,
          print_background: this.getNodeParameter('print_background', i) as boolean,
          margin: this.getNodeParameter('margin', i) as string,
        };

        const headerHtml = this.getNodeParameter('header_html', i, '') as string;
        if (headerHtml) options.header_html = headerHtml;

        const footerHtml = this.getNodeParameter('footer_html', i, '') as string;
        if (footerHtml) options.footer_html = footerHtml;

        if (this.getNodeParameter('tabular_nums', i) as boolean) options.tabular_nums = true;
        if (this.getNodeParameter('deduplicate_images', i) as boolean) options.deduplicate_images = true;
        if (this.getNodeParameter('pdf_a', i) as boolean) options.pdf_a = true;

        const password = this.getNodeParameter('password', i, '') as string;
        if (password) options.password = password;

        const body: IDataObject = { options };

        if (operation === 'renderHtml') {
          body.html = inputValue;
        } else {
          body.url = inputValue;
        }

        const store = this.getNodeParameter('store', i) as boolean;
        if (store) body.store = true;

        const filename = this.getNodeParameter('filename', i, '') as string;
        if (filename) body.filename = filename;

        // When store: true the API returns JSON (document_id, document_url, etc.).
        // When store: false (default) the API returns PDF bytes.
        if (store) {
          let jsonResponse: IDataObject;
          try {
            jsonResponse = await this.helpers.httpRequest({
              method: 'POST',
              url: `${API_BASE}/v1/pdf`,
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body,
              json: true,
            }) as IDataObject;
          } catch (err) {
            throw new NodeOperationError(this.getNode(), extractApiError(err), { itemIndex: i });
          }
          returnData.push({ json: jsonResponse });
        } else {
          let response: ArrayBuffer;
          try {
            response = await this.helpers.httpRequest({
              method: 'POST',
              url: `${API_BASE}/v1/pdf`,
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body,
              encoding: 'arraybuffer',
              returnFullResponse: false,
            }) as ArrayBuffer;
          } catch (err) {
            throw new NodeOperationError(this.getNode(), extractApiError(err), { itemIndex: i });
          }

          const buffer = Buffer.isBuffer(response)
            ? response
            : Buffer.from(response);

          const outputFilename =
            (body.filename as string | undefined) || 'document.pdf';

          const binaryData = await this.helpers.prepareBinaryData(
            buffer,
            outputFilename,
            'application/pdf',
          );

          returnData.push({
            binary: { data: binaryData },
            json: { filename: outputFilename },
          });
        }
      } else if (operation === 'batchRender') {
        const requestsRaw = this.getNodeParameter('requests', i) as string | IDataObject[];
        const globalOptionsRaw = this.getNodeParameter('global_options', i, '{}') as
          | string
          | IDataObject;
        const webhookUrl = this.getNodeParameter('webhook_url', i, '') as string;
        const webhookSecret = this.getNodeParameter('webhook_secret', i, '') as string;

        let requests: IDataObject[];
        let globalOptions: IDataObject;
        try {
          requests = typeof requestsRaw === 'string'
            ? (JSON.parse(requestsRaw) as IDataObject[])
            : requestsRaw;
          globalOptions = typeof globalOptionsRaw === 'string'
            ? (JSON.parse(globalOptionsRaw) as IDataObject)
            : globalOptionsRaw;
        } catch {
          throw new NodeOperationError(this.getNode(), 'Invalid JSON in Requests or Global Options', { itemIndex: i });
        }
        if (!Array.isArray(requests) || requests.length === 0) {
          throw new NodeOperationError(this.getNode(), 'Requests must be a non-empty JSON array', { itemIndex: i });
        }

        const body: IDataObject = { requests, options: globalOptions };
        if (webhookUrl) body.webhook_url = webhookUrl;
        if (webhookSecret) body.webhook_secret = webhookSecret;

        let response: IDataObject;
        try {
          response = await this.helpers.httpRequest({
            method: 'POST',
            url: `${API_BASE}/v1/pdf/batch`,
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body,
            json: true,
          }) as IDataObject;
        } catch (err) {
          throw new NodeOperationError(this.getNode(), extractApiError(err), { itemIndex: i });
        }

        returnData.push({ json: response });
      } else if (operation === 'getDocument') {
        const documentId = this.getNodeParameter('documentId', i) as string;

        if (!documentId.trim()) {
          throw new NodeOperationError(this.getNode(), 'Document ID is required', { itemIndex: i });
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(documentId)) {
          throw new NodeOperationError(this.getNode(), 'Document ID contains invalid characters', { itemIndex: i });
        }

        let response: ArrayBuffer;
        try {
          response = await this.helpers.httpRequest({
            method: 'GET',
            url: `${API_BASE}/v1/documents/${encodeURIComponent(documentId)}`,
            headers: { Authorization: `Bearer ${apiKey}` },
            encoding: 'arraybuffer',
            returnFullResponse: false,
          }) as ArrayBuffer;
        } catch (err) {
          throw new NodeOperationError(this.getNode(), extractApiError(err), { itemIndex: i });
        }

        const buffer = Buffer.isBuffer(response)
          ? response
          : Buffer.from(response);

        const binaryData = await this.helpers.prepareBinaryData(
          buffer,
          `${documentId}.pdf`,
          'application/pdf',
        );

        returnData.push({
          binary: { data: binaryData },
          json: { documentId },
        });
      } else if (operation === 'listDocuments') {
        const limit = this.getNodeParameter('limit', i, 20) as number;
        if (limit < 1 || limit > 100) {
          throw new NodeOperationError(this.getNode(), 'Limit must be between 1 and 100', { itemIndex: i });
        }
        const before = this.getNodeParameter('before', i, '') as string;

        const qs: IDataObject = { limit };
        if (before) qs.before = before;

        let response: IDataObject;
        try {
          response = await this.helpers.httpRequest({
            method: 'GET',
            url: `${API_BASE}/v1/documents`,
            headers: { Authorization: `Bearer ${apiKey}` },
            qs,
            json: true,
          }) as IDataObject;
        } catch (err) {
          throw new NodeOperationError(this.getNode(), extractApiError(err), { itemIndex: i });
        }

        returnData.push({ json: response });
      } else if (operation === 'checkUsage') {
        let response: IDataObject;
        try {
          response = await this.helpers.httpRequest({
            method: 'GET',
            url: `${API_BASE}/v1/me`,
            headers: { Authorization: `Bearer ${apiKey}` },
            json: true,
          }) as IDataObject;
        } catch (err) {
          throw new NodeOperationError(this.getNode(), extractApiError(err), { itemIndex: i });
        }

        returnData.push({ json: response });
      } else {
        throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, {
          itemIndex: i,
        });
      }
    }

    return [returnData];
  }
}
