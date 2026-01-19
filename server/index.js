require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const SYSTEM_PROMPT = `Transform the following text for a person with cognitive disabilities (W3C COGA guidelines). 
Return a JSON object with the following structure (do not wrap in markdown code blocks):
{
  "summary": "2-3 sentence summary using literal language",
  "steps": ["Step 1", "Step 2", ...],
  "simplifiedText": "The entire text rewritten using concrete words and simple sentence structures"
}`;

const app = express();
const port = process.env.PORT || 3020;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for large page content

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

app.post('/summarize', async (req, res) => {
    try {
        const { text } = req.body;
        console.log('Received text for summarization:', text ? text.slice(0, 100) + '...' : 'No text');

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        // Truncate text if it's too long to avoid token limits (rudimentary check)
        const truncatedText = text.slice(0, 15000); 

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `Please process the following text:\n\n${truncatedText}` }
            ],
            model: "gpt-4o",
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0].message.content;
        const data = JSON.parse(content);
        console.log('Generated summary data:', data);
        res.json(data);

    } catch (error) {
        console.error('Error summarizing text:', error);
        res.status(500).json({ error: 'Failed to generate summary', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
