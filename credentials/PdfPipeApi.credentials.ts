import {
  IAuthenticateGeneric,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class PdfPipeApi implements ICredentialType {
  name = 'pdfPipeApi';

  displayName = 'PDFPipe API';

  documentationUrl = 'https://pdfpipe.xyz/docs';

  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'Your PDFPipe API key. It looks like pp_live_...',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.apiKey}}',
      },
    },
  };
}
