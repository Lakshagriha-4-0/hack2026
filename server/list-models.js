const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const key = process.env.GEMINI_API_KEY;

async function listModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    try {
        const resp = await axios.get(url);
        const flashModels = (resp.data.models || []).filter(m => m.name.includes('1.5-flash'));
        console.log('Flash 1.5 Models:');
        flashModels.forEach(m => console.log(`- ${m.name}`));
        if (flashModels.length === 0) {
            console.log('No Flash 1.5 models found. First 5 models:');
            (resp.data.models || []).slice(0, 5).forEach(m => console.log(`- ${m.name}`));
        }
    } catch (error) {
        console.error('Error listing models:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    }
}

listModels();
