const axios = require('axios');
const logger = require('./logger');

const normalizeSkill = (s = '') => String(s || '').trim().toLowerCase();

const fallbackGenerateQuestions = (jobTitle = '', requiredSkills = []) => {
    const skills = (requiredSkills || []).filter(Boolean).slice(0, 5);
    const safeSkills = skills.length ? skills : ['communication', 'problem solving', 'teamwork'];

    return safeSkills.map((skill, index) => {
        const sid = `q${index + 1}`;
        return {
            questionId: sid,
            question: `Which option best demonstrates practical knowledge of ${skill} for the role ${jobTitle || 'this role'}?`,
            options: [
                `I can explain and use ${skill} in projects`,
                `I have only heard the term ${skill}`,
                `I never worked with ${skill}`,
                `I avoid tasks requiring ${skill}`,
            ],
            correctAnswer: `I can explain and use ${skill} in projects`,
        };
    });
};

const parseModelJson = (raw = '') => {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return null;
    try {
        return JSON.parse(trimmed);
    } catch (_error) {
        const start = trimmed.indexOf('{');
        const end = trimmed.lastIndexOf('}');
        if (start !== -1 && end > start) {
            try {
                return JSON.parse(trimmed.slice(start, end + 1));
            } catch (_e) {
                return null;
            }
        }
    }
    return null;
};

const generateQuestionsWithGemini = async (job) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;

    const requiredSkills = Array.isArray(job?.requiredSkills) ? job.requiredSkills : [];
    const prompt = `Create exactly 5 multiple-choice screening questions for a job candidate.
Return ONLY valid JSON in this shape:
{
  "questions": [
    {
      "questionId": "q1",
      "question": "text",
      "options": ["a","b","c","d"],
      "correctAnswer": "one option from options"
    }
  ]
}
Rules:
- Questions must check real skill fit for: ${job?.title || 'this role'}.
- Use these required skills: ${requiredSkills.join(', ')}
- Keep language simple.
- Each options array must have exactly 4 options.
- correctAnswer must match one option exactly.
- No markdown.
`;

    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/` +
        `gemini-2.5-flash:generateContent?key=${key}`;

    const resp = await axios.post(
        url,
        {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.2,
                responseMimeType: 'application/json',
            },
        },
        { timeout: 20000 }
    );

    const text =
        resp?.data?.candidates?.[0]?.content?.parts
            ?.map((p) => p?.text || '')
            .join('\n') || '';
    const parsed = parseModelJson(text);
    const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
    if (!questions.length) return null;

    const normalized = questions
        .map((q, idx) => {
            const options = Array.isArray(q?.options)
                ? q.options.map((o) => String(o || '').trim()).filter(Boolean).slice(0, 4)
                : [];
            const correctAnswer = String(q?.correctAnswer || '').trim();
            if (!q?.question || options.length < 2 || !options.includes(correctAnswer)) return null;
            return {
                questionId: String(q?.questionId || `q${idx + 1}`),
                question: String(q.question).trim(),
                options,
                correctAnswer,
            };
        })
        .filter(Boolean)
        .slice(0, 5);

    return normalized.length >= 3 ? normalized : null;
};

const generateEligibilityQuestions = async (job) => {
    try {
        const aiQuestions = await generateQuestionsWithGemini(job);
        if (aiQuestions) {
            return { generatedBy: 'ai', questions: aiQuestions };
        }
    } catch (error) {
        logger.wrn('eligibility.generate.ai.fail', { e: error.message });
    }

    return {
        generatedBy: 'fallback',
        questions: fallbackGenerateQuestions(job?.title, job?.requiredSkills),
    };
};

const generateRecruiterRoundQuestions = async (job) => {
    try {
        const aiQuestions = await generateQuestionsWithGemini(job);
        if (aiQuestions) {
            return { generatedBy: 'ai', questions: aiQuestions };
        }
    } catch (error) {
        logger.wrn('recruiter.test.generate.ai.fail', { e: error.message });
    }

    return {
        generatedBy: 'manual',
        questions: fallbackGenerateQuestions(job?.title, job?.requiredSkills),
    };
};

const evaluateAnswers = (questions = [], submittedAnswers = []) => {
    const answerMap = new Map(
        (submittedAnswers || []).map((item) => [String(item?.questionId || ''), String(item?.answer || '').trim()])
    );

    let correctCount = 0;
    const details = questions.map((q) => {
        const userAnswer = answerMap.get(String(q.questionId)) || '';
        const isCorrect = normalizeSkill(userAnswer) === normalizeSkill(q.correctAnswer);
        if (isCorrect) correctCount += 1;
        return {
            questionId: q.questionId,
            answer: userAnswer,
            isCorrect,
        };
    });

    const total = questions.length || 1;
    const score = Math.round((correctCount / total) * 100);
    return { score, details };
};

module.exports = {
    generateEligibilityQuestions,
    generateRecruiterRoundQuestions,
    evaluateAnswers,
};
