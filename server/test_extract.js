const pdfParse = require('pdf-parse');
const fs = require('fs/promises');
const path = require('path');

async function test() {
    const filePath = 'c:\\Users\\Lalit Nandan\\Desktop\\hack2026\\server\\uploads\\resumes\\1772203475756-Aman_Singh_Kunwar_Resume.pdf';
    try {
        const buffer = await fs.readFile(filePath);
        console.log('File read size:', buffer.length);
        const data = await pdfParse(buffer);
        console.log('PDF text length:', data.text ? data.text.length : 0);
        console.log('PDF text start:', data.text ? data.text.slice(0, 100) : 'N/A');
    } catch (err) {
        console.error('Error:', err);
    }
}

test();
