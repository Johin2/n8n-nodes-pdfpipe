import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  JsonObject,
  NodeApiError,
  NodeConnectionType,
} from 'n8n-workflow';

export class PdfPipe implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'PDFPipe',
    name: 'pdfPipe',
    icon: 'file:pdfPipe.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["source"]}}',
    description: 'Generate a PDF from HTML or a URL with PDFPipe',
    defaults: {
      name: 'PDFPipe',
    },
    inputs: ['main'] as NodeConnectionType[],
    outputs: ['main'] as NodeConnectionType[],
    credentials: [
      {
        name: 'pdfPipeApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Source',
        name: 'source',
        type: 'options',
        options: [
          { name: 'HTML', value: 'html' },
          { name: 'URL', value: 'url' },
        ],
        default: 'html',
        description: 'Whether to render an HTML string or a public URL',
      },
      {
        displayName: 'HTML',
        name: 'html',
        type: 'string',
        typeOptions: { rows: 6 },
        displayOptions: { show: { source: ['html'] } },
        default: '',
        placeholder: '<h1>Invoice #4012</h1>',
        description: 'The HTML to render into a PDF',
      },
      {
        displayName: 'URL',
        name: 'url',
        type: 'string',
        displayOptions: { show: { source: ['url'] } },
        default: '',
        placeholder: 'https://example.com',
        description: 'The public URL to render into a PDF',
      },
      {
        displayName: 'Output Binary Field',
        name: 'binaryProperty',
        type: 'string',
        default: 'data',
        description: 'Name of the binary field to put the generated PDF into',
      },
      {
        displayName: 'File Name',
        name: 'fileName',
        type: 'string',
        default: 'document.pdf',
        description: 'File name for the generated PDF',
      },
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        options: [
          {
            displayName: 'Format',
            name: 'format',
            type: 'options',
            options: [
              { name: 'A4', value: 'A4' },
              { name: 'A3', value: 'A3' },
              { name: 'A5', value: 'A5' },
              { name: 'Letter', value: 'Letter' },
              { name: 'Legal', value: 'Legal' },
              { name: 'Tabloid', value: 'Tabloid' },
            ],
            default: 'A4',
          },
          {
            displayName: 'Landscape',
            name: 'landscape',
            type: 'boolean',
            default: false,
          },
          {
            displayName: 'Margin',
            name: 'margin',
            type: 'string',
            default: '1cm',
            description: 'Any CSS length, for example 1cm',
          },
          {
            displayName: 'Print Background',
            name: 'print_background',
            type: 'boolean',
            default: true,
          },
          {
            displayName: 'Scale',
            name: 'scale',
            type: 'number',
            typeOptions: { minValue: 0.1, maxValue: 2 },
            default: 1,
          },
          {
            displayName: 'Timeout (ms)',
            name: 'timeout_ms',
            type: 'number',
            typeOptions: { minValue: 1000, maxValue: 60000 },
            default: 30000,
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const source = this.getNodeParameter('source', i) as string;
        const binaryProperty = this.getNodeParameter('binaryProperty', i) as string;
        const fileName = this.getNodeParameter('fileName', i) as string;
        const options = this.getNodeParameter('options', i, {}) as Record<string, unknown>;

        const body: { html?: string; url?: string; options: Record<string, unknown> } = {
          options,
        };
        if (source === 'html') {
          body.html = this.getNodeParameter('html', i) as string;
        } else {
          body.url = this.getNodeParameter('url', i) as string;
        }

        const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'pdfPipeApi', {
          method: 'POST',
          url: 'https://api.pdfpipe.xyz/v1/pdf',
          body,
          json: true,
          encoding: 'arraybuffer',
          returnFullResponse: false,
        })) as ArrayBuffer;

        const binaryData = await this.helpers.prepareBinaryData(
          Buffer.from(response),
          fileName,
          'application/pdf',
        );

        returnData.push({
          json: { success: true, fileName },
          binary: { [binaryProperty]: binaryData },
          pairedItem: { item: i },
        });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: (error as Error).message },
            pairedItem: { item: i },
          });
          continue;
        }
        throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
      }
    }

    return [returnData];
  }
}
