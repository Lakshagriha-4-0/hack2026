const pdfLib = require('pdf-parse');
const pdfParse = typeof pdfLib === 'function' ? pdfLib : pdfLib.PDFParse;
const mammoth = require('mammoth');
const axios = require('axios');
const fs = require('fs/promises');
const logger = require('./logger');

const SKILLS = [
  'javascript',
  'typescript',
  'react',
  'node',
  'express',
  'mongodb',
  'sql',
  'python',
  'java',
  'docker',
  'kubernetes',
  'aws',
  'html',
  'css',
  'tailwind',
  'git',
];

const toCleanString = (value = '') => String(value || '').trim();
const toStringArray = (value) =>
  Array.isArray(value) ? value.map((v) => toCleanString(v)).filter(Boolean) : [];

const extractResumeText = async (file) => {
  const mime = file.mimetype || '';
  const name = (file.originalname || '').toLowerCase();
  const buffer = file.buffer || (file.path ? await fs.readFile(file.path) : Buffer.from(''));

  try {
    if (mime.includes('pdf') || name.endsWith('.pdf')) {
      const data = await pdfParse(buffer);
      return data.text || '';
    }

    if (
      mime.includes('word') ||
      mime.includes('officedocument.wordprocessingml') ||
      name.endsWith('.docx')
    ) {
      const data = await mammoth.extractRawText({ buffer });
      return data.value || '';
    }

    if (mime.includes('text') || name.endsWith('.txt')) {
      return buffer.toString('utf8');
    }
    return '';
  } catch (error) {
    logger.wrn('resume.text.extract.fallback', { e: error.message });
    return '';
  }
};

const extractDetailsLocal = (text) => {
  const normalizePhone = (value = '') => {
    const cleaned = String(value).trim();
    if (!cleaned) return '';
    const digits = cleaned.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 12) return '';
    return cleaned;
  };

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const email = (text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0] || '';
  const phoneRaw =
    (text.match(/(\+?\d[\d\s\-()]{8,}\d)/) || [])[0]?.replace(/\s+/g, ' ').trim() || '';
  const phone = normalizePhone(phoneRaw);
  const linkedin =
    (text.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i) || [])[0] || '';
  const github = (text.match(/https?:\/\/(?:www\.)?github\.com\/[^\s)]+/i) || [])[0] || '';

  const expMatch = text.match(/(\d{1,2})\+?\s*(?:years|yrs)/i);
  const experienceYears = expMatch ? Number(expMatch[1]) : undefined;

  const collegeLine =
    lines.find((line) => /(university|college|institute|school)/i.test(line)) || '';

  const nameGuess = lines[0] && lines[0].length <= 80 ? lines[0] : '';
  const looksLikeName = /^[a-zA-Z.\s'-]+$/.test(nameGuess) && nameGuess.split(' ').length <= 5;

  const textLower = text.toLowerCase();
  const detectedSkills = SKILLS.filter((skill) => textLower.includes(skill));

  return {
    personal: {
      fullName: looksLikeName ? nameGuess : '',
      email,
      phone,
      gender: '',
      college: collegeLine,
      address: '',
      bio: '',
      githubLink: github,
      linkedinLink: linkedin,
      currentRole: '',
      currentCompany: '',
    },
    public: {
      skills: detectedSkills,
      experienceYears,
      tagline: '',
      projects: [],
      education: [],
      experience: [],
      portfolioLink: '',
      city: '',
    },
  };
};

const parseModelJson = (raw = '') => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch (e) {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch (err) {
        return null;
      }
    }
  }
  return null;
};

const extractWithGemini = async (text) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const prompt = `Extract candidate details from this resume text.
Return ONLY valid JSON with this exact shape:
{
  "personal": {
    "fullName": "",
    "email": "",
    "phone": "",
    "gender": "",
    "college": "",
    "address": "",
    "bio": "",
    "githubLink": "",
    "linkedinLink": "",
    "currentRole": "",
    "currentCompany": ""
  },
  "public": {
    "skills": [],
    "experienceYears": 0,
    "tagline": "",
    "projects": [
      { "title": "", "description": "", "link": "", "technologies": [] }
    ],
    "education": [
      { "school": "", "degree": "", "fieldOfStudy": "", "startYear": 0, "endYear": 0 }
    ],
    "experience": [
      { "company": "", "role": "", "location": "", "description": "", "startDate": "", "endDate": "", "isCurrent": false }
    ],
    "portfolioLink": "",
    "city": ""
  }
}
Rules:
- Do not include markdown or backticks.
- Keep unknown fields as empty string, empty list, or 0.
- skills must be array of short strings.
- experienceYears must be a number.
- Keep arrays concise and only include real entries from resume.
Resume:
${text.slice(0, 12000)}
`;

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `gemini-1.5-flash:generateContent?key=${key}`;

  const resp = await axios.post(
    url,
    {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    },
    {
      timeout: 20000,
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const data = resp.data || {};
  const modelText =
    data?.candidates?.[0]?.content?.parts
      ?.map((p) => p?.text || '')
      .join('\n') || '';
  const parsed = parseModelJson(modelText);
  if (!parsed || !parsed.personal || !parsed.public) return null;

  const normProjects = Array.isArray(parsed.public.projects)
    ? parsed.public.projects
      .map((p) => ({
        title: toCleanString(p?.title),
        description: toCleanString(p?.description),
        link: toCleanString(p?.link),
        technologies: toStringArray(p?.technologies),
      }))
      .filter((p) => p.title || p.description || p.link || p.technologies.length)
    : [];

  const normEducation = Array.isArray(parsed.public.education)
    ? parsed.public.education
      .map((e) => ({
        school: toCleanString(e?.school),
        degree: toCleanString(e?.degree),
        fieldOfStudy: toCleanString(e?.fieldOfStudy),
        startYear: Number(e?.startYear || 0) || undefined,
        endYear: Number(e?.endYear || 0) || undefined,
      }))
      .filter((e) => e.school || e.degree || e.fieldOfStudy)
    : [];

  const normExperience = Array.isArray(parsed.public.experience)
    ? parsed.public.experience
      .map((x) => ({
        company: toCleanString(x?.company),
        role: toCleanString(x?.role),
        location: toCleanString(x?.location),
        description: toCleanString(x?.description),
        startDate: toCleanString(x?.startDate),
        endDate: toCleanString(x?.endDate),
        isCurrent: Boolean(x?.isCurrent),
      }))
      .filter((x) => x.company || x.role || x.description)
    : [];

  return {
    personal: {
      fullName: toCleanString(parsed.personal.fullName),
      email: toCleanString(parsed.personal.email),
      phone: toCleanString(parsed.personal.phone),
      gender: toCleanString(parsed.personal.gender),
      college: toCleanString(parsed.personal.college),
      address: toCleanString(parsed.personal.address),
      bio: toCleanString(parsed.personal.bio),
      githubLink: toCleanString(parsed.personal.githubLink),
      linkedinLink: toCleanString(parsed.personal.linkedinLink),
      currentRole: toCleanString(parsed.personal.currentRole),
      currentCompany: toCleanString(parsed.personal.currentCompany),
    },
    public: {
      skills: toStringArray(parsed.public.skills),
      experienceYears: Number(parsed.public.experienceYears || 0) || 0,
      tagline: toCleanString(parsed.public.tagline),
      projects: normProjects,
      education: normEducation,
      experience: normExperience,
      portfolioLink: toCleanString(parsed.public.portfolioLink),
      city: toCleanString(parsed.public.city),
    },
  };
};

const extractDetailsFromResume = async (text) => {
  try {
    const aiResult = await extractWithGemini(text);
    if (aiResult) {
      logger.inf('resume.extract.ai.ok');
      return aiResult;
    }
  } catch (error) {
    logger.wrn('resume.extract.ai.fallback', { e: error.message });
  }

  return extractDetailsLocal(text);
};

const anonymizeResumeText = (text, personal = {}) => {
  let cleaned = text || '';

  const redactValue = (value) => {
    if (!value || typeof value !== 'string') return;
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(escaped, 'gi'), '[REDACTED]');
  };

  redactValue(personal.fullName);
  redactValue(personal.gender);
  redactValue(personal.college);

  cleaned = cleaned.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]');
  cleaned = cleaned.replace(/(\+?\d[\d\s\-()]{8,}\d)/g, '[REDACTED_PHONE]');

  cleaned = cleaned
    .split(/\r?\n/)
    .filter((line) => !/(gender|photo|profile picture)/i.test(line))
    .join('\n');

  return cleaned;
};

const sanitizeReadableText = (text = '') =>
  text
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const isReadableText = (text = '') => {
  if (!text) return false;
  const printable = (text.match(/[\x20-\x7E\n\r\t]/g) || []).length;
  return printable / text.length > 0.9;
};

const generateBiasFreePreviewWithGemini = async (text) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const prompt = `You are an expert at removing bias from resumes for fair hiring.
Rewrite the following resume text to be COMPLETELY ANONYMOUS and BIAS-FREE.
Rules:
1. Remove all names, email addresses, phone numbers, and social media links.
2. Remove gender, age, ethnicity, religion, or any personal identity markers.
3. Remove specific college names (replace with "Reputed University" or similar).
4. Keep all professional experience, skills, and achievements intact, but anonymized.
5. Focus on WHAT the person did, not WHO they are.
6. Return only the anonymized text.

Resume:
${text.slice(0, 10000)}
`;

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `gemini-1.5-flash:generateContent?key=${key}`;

  try {
    const resp = await axios.post(
      url,
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 },
      },
      { timeout: 15000 }
    );
    return resp.data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (err) {
    logger.wrn('resume.biasfree.ai.fail', { e: err.message });
    return null;
  }
};

const buildBiasResumePreview = async ({ rawText = '', personal = {}, extracted = {}, publicData = {} }) => {
  // Try AI first for better quality
  const aiPreview = await generateBiasFreePreviewWithGemini(rawText);
  if (aiPreview) {
    logger.inf('resume.biasfree.ai.ok');
    return sanitizeReadableText(aiPreview);
  }

  const anonymized = sanitizeReadableText(anonymizeResumeText(rawText, personal));
  if (anonymized && anonymized.length > 120 && isReadableText(anonymized)) {
    return anonymized;
  }

  const skills = Array.isArray(publicData.skills) ? publicData.skills : extracted?.public?.skills || [];
  const experienceYears = publicData.experienceYears || extracted?.public?.experienceYears || 0;
  const tagline = publicData.tagline || '';
  const city = publicData.city || '';

  return sanitizeReadableText(
    [
      'Bias-Free Candidate Profile',
      '',
      tagline ? `Tagline: ${tagline}` : '',
      experienceYears ? `Experience: ${experienceYears} years` : '',
      city ? `Location: ${city}` : '',
      skills.length ? `Skills: ${skills.join(', ')}` : '',
      '',
      'Identity-protected details are hidden until shortlist.',
    ]
      .filter(Boolean)
      .join('\n')
  );
};

module.exports = {
  extractResumeText,
  extractDetailsFromResume,
  anonymizeResumeText,
  buildBiasResumePreview,
  generateBiasFreePreviewWithGemini,
};
