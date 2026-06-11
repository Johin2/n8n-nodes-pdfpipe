# n8n-nodes-pdfpipe

An [n8n](https://n8n.io) community node that generates a PDF from HTML or a URL using the [PDFPipe](https://pdfpipe.xyz) API. Real Chromium rendering, flat pricing, 500 free documents a month.

## Installation

In n8n, go to **Settings → Community Nodes → Install** and enter:

```
n8n-nodes-pdfpipe
```

## Credentials

Create a **PDFPipe API** credential and paste your API key (looks like `pp_live_...`). Get one at [pdfpipe.xyz](https://pdfpipe.xyz).

## Node: PDFPipe

The node takes HTML or a URL and outputs the rendered PDF as binary data you can attach to an email, upload, or save.

- **Source**: HTML or URL
- **HTML / URL**: the content to render
- **Output Binary Field**: which binary property to store the PDF in (default `data`)
- **File Name**: the PDF file name (default `document.pdf`)
- **Options**: format (A4, Letter, etc.), landscape, margin, print background, scale, timeout

### Example

Trigger → **PDFPipe** (Source: HTML, HTML: `<h1>Invoice #{{$json.orderId}}</h1>`) → **Send Email** (attach the binary `data`).

## License

MIT
