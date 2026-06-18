# n8n-nodes-pdfpipe

Community n8n node for [PDFPipe](https://pdfpipe.xyz), the HTML-to-PDF API.

## Installation

In your n8n instance, go to **Settings > Community Nodes** and install:

```
n8n-nodes-pdfpipe
```

Or install manually via npm in the n8n data directory:

```bash
npm install n8n-nodes-pdfpipe
```

## Credentials

Create a **PDFPipe API** credential with your API key. Keys start with `pp_live_` and can be found in your [PDFPipe dashboard](https://pdfpipe.xyz/dashboard).

## Operations

| Operation | Description |
|-----------|-------------|
| Render HTML | Convert an HTML string to a PDF file |
| Render URL | Convert a web page URL to a PDF file |
| Batch Render | Render multiple HTML or URL items in one request |
| Get Document | Retrieve a stored PDF document by ID |
| List Documents | List all stored PDF documents |
| Check Usage | Check current usage and plan limits |

## Documentation

Full API reference: [pdfpipe.xyz/docs](https://pdfpipe.xyz/docs)

## License

MIT
