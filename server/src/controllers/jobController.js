const Job = require('../models/Job');
const cache = require('../utils/responseCache');

// @desc    Create a new job
// @route   POST /api/jobs
// @access  Private/Recruiter
const createJob = async (req, res) => {
    const { title, description, requiredSkills, experienceLevel, location, salaryRange } = req.body;

    const job = new Job({
        recruiterId: req.user._id,
        title,
        description,
        requiredSkills,
        experienceLevel,
        location,
        salaryRange,
    });

    const createdJob = await job.save();
    cache.clearByPrefix('jobs:');
    res.status(201).json(createdJob);
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
