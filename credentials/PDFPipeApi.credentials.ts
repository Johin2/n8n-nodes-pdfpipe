import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class PDFPipeApi implements ICredentialType {
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
      description: 'Your PDFPipe API key (starts with pp_live_)',
    },
  ];
  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: { Authorization: '=Bearer {{$credentials.apiKey}}' },
    },
  };
  test: ICredentialTestRequest = {
    request: {
      baseURL: 'https://api.pdfpipe.xyz',
      url: '/v1/me',
    },
  };
}
