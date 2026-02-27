const Job = require('../models/Job');
const cache = require('../utils/responseCache');

// @desc    Create a new job
// @route   POST /api/jobs
// @access  Private/Recruiter
const createJob = async (req, res) => {
    try {
        const { title, description, requiredSkills, experienceLevel, location, salaryRange, recruiterTest } = req.body;

        const normalizedSkills = Array.isArray(requiredSkills)
            ? requiredSkills.map((s) => String(s || '').trim()).filter(Boolean)
            : String(requiredSkills || '')
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);

        if (!req.user?._id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (!title || !description || !normalizedSkills.length) {
            return res.status(400).json({
                message: 'Title, description and at least one required skill are mandatory',
            });
        }

        const providedQuestions = Array.isArray(recruiterTest?.questions) ? recruiterTest.questions : [];
        const normalizedQuestions = providedQuestions
            .map((q, idx) => {
                const options = Array.isArray(q?.options)
                    ? q.options.map((o) => String(o || '').trim()).filter(Boolean)
                    : [];
                const correctAnswer = String(q?.correctAnswer || '').trim();
                if (!q?.question || options.length < 2 || !options.includes(correctAnswer)) return null;
                return {
                    questionId: String(q?.questionId || `rq${idx + 1}`),
                    question: String(q.question).trim(),
                    options,
                    correctAnswer,
                };
            })
            .filter(Boolean);

        if (!normalizedQuestions.length) {
            return res.status(400).json({
                message: 'Recruiter qualification test is required (add at least one valid question)',
            });
        }

        const passScore = Number(recruiterTest?.passScore || 60);

        const job = new Job({
            recruiterId: req.user._id,
            title,
            description,
            requiredSkills: normalizedSkills,
            experienceLevel,
            location,
            salaryRange,
            recruiterTest: {
                questions: normalizedQuestions,
                passScore: Number.isFinite(passScore) ? Math.min(100, Math.max(0, passScore)) : 60,
                generatedBy: recruiterTest?.generatedBy === 'ai' ? 'ai' : 'manual',
            },
        });

        const createdJob = await job.save();
        cache.clearByPrefix('jobs:');
        return res.status(201).json(createdJob);
    } catch (error) {
        if (error?.name === 'ValidationError') {
            const firstIssue = Object.values(error.errors || {})[0]?.message;
            return res.status(400).json({ message: firstIssue || 'Invalid job data' });
        }
        return res.status(500).json({ message: 'Failed to create job' });
    }
};

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Public
const getJobs = async (req, res) => {
    const cacheKey = 'jobs:list';
    const cached = cache.get(cacheKey);
    if (cached) {
        return res.json(cached);
    }

    const jobs = await Job.find({})
        .select('recruiterId title description requiredSkills experienceLevel location salaryRange createdAt')
        .populate('recruiterId', 'name email')
        .lean();
    cache.set(cacheKey, jobs, 30000);
    res.json(jobs);
};

// @desc    Get recruiter's own jobs
// @route   GET /api/jobs/mine
// @access  Private/Recruiter
const getMyJobs = async (req, res) => {
    const jobs = await Job.find({ recruiterId: req.user._id })
        .select('title description requiredSkills experienceLevel location salaryRange createdAt')
        .lean();
    res.json(jobs);
};

// @desc    Get job details
// @route   GET /api/jobs/:id
// @access  Public
const getJobById = async (req, res) => {
    const cacheKey = `jobs:detail:${req.params.id}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        return res.json(cached);
    }

    const job = await Job.findById(req.params.id)
        .select('recruiterId title description requiredSkills experienceLevel location salaryRange createdAt')
        .populate('recruiterId', 'name email')
        .lean();

    if (job) {
        cache.set(cacheKey, job, 30000);
        res.json(job);
    } else {
        res.status(404);
        throw new Error('Job not found');
    }
};

module.exports = { createJob, getJobs, getMyJobs, getJobById };
