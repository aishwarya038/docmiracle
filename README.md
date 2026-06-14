# DocMiracle – Chat With Your Documents

DocMiracle is an AI-powered document Q&A application. Upload a document, and ask questions about it in a chat interface—the AI reads the document and answers based on its actual content.




## How It Works

DocMiracle uses a **context-augmented generation** approach:

1. **Extract:** When a document is uploaded, its text is extracted on the client (using `pdfjs-dist` for PDFs, native reading for TXT/MD/CSV/JSON).
2. **Augment:** The extracted text is injected directly into the system prompt as context.
3. **Generate:** The Groq API (Llama 3) generates answers grounded in the content.


## Features

* **Multi-format support:** PDF, TXT, MD, CSV, and JSON.
* **AI-powered conversations:** Summarize, extract key points, compare sections, and generate tables.
* **Structured Markdown output:** Bullet points, lists, and tables (via `react-markdown` + `remark-gfm`).
* **High-speed inference:** Powered by Groq's LPU infrastructure.
* **Secure backend:** API keys are handled server-side.
* **Responsive UI:** light-themed, mobile-friendly interface.



## Tech Stack

| Category | Technology |
| --- | --- |
| **Framework** | Next.js (App Router) |
| **Language** | JavaScript |
| **Styling** | Tailwind CSS v4 + `@tailwindcss/typography` |
| **AI Provider** | Groq API (`llama-3.1-8b-instant`) |
| **Parsing** | `pdfjs-dist` |
| **Rendering** | `react-markdown`, `remark-gfm` |
| **Deployment** | Vercel |



## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/aishwarya038/docmiracle.git
cd docmiracle

```

### 2. Install dependencies

```bash
npm install

```

### 3. Configure environment variables

Create a `.env.local` file in the root directory and add your API key:

```env
GROQ_API_KEY=your_groq_api_key_here

```
*(Get a free API key from [console.groq.com](https://console.groq.com))*

### 4. Run the development server

```bash
npm run dev

```

### 5. Access the app

Visit `http://localhost:3000` in your browser.


## Usage

1. **Upload:** Use the upload panel to add your file.
2. **Parse:** Wait for the document to be processed (file size and word count will appear in the sidebar).
3. **Chat:** Ask questions like:
* *"Summarize this document in 5 bullet points"*
* *"What are the key takeaways?"*
* *"Create a table of key terms and their definitions"*



## Project Structure

```text
src/
├── app/
│   ├── api/chat/route.js   # API route — handles Groq API calls
│   ├── globals.css         # Tailwind config + theme variables
│   ├── layout.js
│   └── page.js             # Main UI (Upload, Chat, Rendering)
└── lib/
    └── utils.js            # Tailwind class-merging utility

```

## Limitations

* **Truncation:** Large documents are limited to ~60,000 characters.
* **Ephemeral:** No persistent storage; documents/history are lost on refresh.
* **Scope:** Single-document context only (no multi-document support).


