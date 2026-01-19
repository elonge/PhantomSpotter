# AI Page Summarizer Extension

A Chrome extension that summarizes the current webpage using OpenAI's GPT models.

## Prerequisites

- Node.js installed.
- An OpenAI API Key.

## Setup

### 1. Backend Server

The server handles the API calls to OpenAI.

1.  Navigate to the `server` directory:
    ```bash
    cd server
    ```
2.  Open the `.env` file and paste your OpenAI API Key:
    ```
    OPENAI_API_KEY=sk-proj-...
    ```
3.  Start the server:
    ```bash
    node index.js
    ```
    The server will run on `http://localhost:3020`.

### 2. Chrome Extension

1.  Open Google Chrome and navigate to `chrome://extensions/`.
2.  Enable **Developer mode** in the top right corner.
3.  Click **Load unpacked**.
4.  Select the `extension` folder from this project.

## Usage

1.  Navigate to any article or webpage you want to summarize.
2.  Click the **Page Summarizer** extension icon (the puzzle piece, or pin it to the toolbar).
3.  Click the **Summarize** button.
4.  A floating card will appear on the top right of the page with the summary.

## Troubleshooting

-   **Error: Failed to fetch:** Ensure the server is running on port 3020.
-   **OpenAI Errors:** Check the server console for logs. Ensure your API key is valid and has credits.
