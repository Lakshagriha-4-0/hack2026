const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const key = process.env.GEMINI_API_KEY;
console.log('Key length:', key?.length);

async function testExtraction() {
    const prompt = `Extract candidate details from this resume text.
Return ONLY valid JSON with this exact shape:
{
  "personal": {
    "fullName": "",
    "email": "",
    "phone": ""
  },
  "public": {
    "skills": [],
    "experienceYears": 0
  }
}
Resume:
John Doe
Software Engineer
john@example.com
555-0199
Skills: React, Node.js
Experience: 5 years
`;

    const urls = [
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`,
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`
    ];

    for (const url of urls) {
        console.log('\nTesting URL:', url);
        try {
            const resp = await axios.post(
                url,
                {
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.1,
                    },
                },
                {
                    timeout: 20000,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
            console.log('Success with URL:', url);
            console.log('Response content:', JSON.stringify(resp.data?.candidates?.[0]?.content?.parts?.[0]?.text, null, 2));
            return;
        } catch (error) {
            console.error('Failed URL:', url);
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', JSON.stringify(error.response.data, null, 2));
            } else {
                console.error('Error message:', error.message);
            }
        }
    }
}

testExtraction();
