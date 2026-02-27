const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const { generateRecruiterRoundQuestions } = require('../utils/eligibilityTestUtils');

// @desc    Get all applications for a specific job (anonymous)
// @route   GET /api/recruiter/jobs/:jobId/applications
// @access  Private/Recruiter
const getJobApplications = async (req, res) => {
    const job = await Job.findById(req.params.jobId).select('recruiterId').lean();

    if (!job) {
        res.status(404);
        throw new Error('Job not found');
    }

    if (job.recruiterId.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to view applications for this job');
    }

    const applications = await Application.find({ jobId: req.params.jobId })
        .select('-privateProfile -recruiterRoundTest.questions.correctAnswer')
        .sort('-matchScore')
        .lean();

    res.json(applications);
};

// @desc    Manual status update disabled by workflow
// @route   PUT /api/recruiter/applications/:appId/status
// @access  Private/Recruiter
const updateApplicationStatus = async (_req, res) => {
    return res.status(403).json({
        message: 'Manual selection is disabled. Candidate status is auto-decided from recruiter test result.',
    });
};

// @desc    Generate recruiter qualification test (AI/fallback)
// @route   POST /api/recruiter/jobs/test/generate
// @access  Private/Recruiter
const generateJobTest = async (req, res) => {
    const { title, requiredSkills } = req.body;
    const safeSkills = Array.isArray(requiredSkills)
        ? requiredSkills.map((s) => String(s || '').trim()).filter(Boolean)
        : [];

    if (!String(title || '').trim() || !safeSkills.length) {
        return res.status(400).json({ message: 'Title and required skills are required for AI test generation' });
    }

    const { questions, generatedBy } = await generateRecruiterRoundQuestions({
        title,
        requiredSkills: safeSkills,
    });

    return res.json({ generatedBy, questions });
};

// @desc    Update recruiter profile
// @route   PUT /api/recruiter/profile
// @access  Private/Recruiter
const updateRecruiterProfile = async (req, res) => {
    const recruiter = await User.findById(req.user._id);
    if (!recruiter || recruiter.role !== 'recruiter') {
        return res.status(404).json({ message: 'Recruiter not found' });
    }

    const incoming = req.body || {};
    const current = recruiter.recruiterProfile?.toObject
        ? recruiter.recruiterProfile.toObject()
        : recruiter.recruiterProfile || {};

    recruiter.recruiterProfile = {
        ...current,
        companyName: String(incoming.companyName ?? current.companyName ?? '').trim(),
        designation: String(incoming.designation ?? current.designation ?? '').trim(),
        phone: String(incoming.phone ?? current.phone ?? '').trim(),
        website: String(incoming.website ?? current.website ?? '').trim(),
        linkedin: String(incoming.linkedin ?? current.linkedin ?? '').trim(),
        location: String(incoming.location ?? current.location ?? '').trim(),
        about: String(incoming.about ?? current.about ?? '').trim(),
    };
    recruiter.markModified('recruiterProfile');
    await recruiter.save();

    return res.json({
        message: 'Recruiter profile updated',
        recruiterProfile: recruiter.recruiterProfile,
    });
};

// @desc    Reveal identity
// @route   GET /api/recruiter/applications/:appId/reveal
// @access  Private/Recruiter
const revealIdentity = async (req, res) => {
    const application = await Application.findById(req.params.appId).lean();

    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }

    if (application.recruiterId.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized');
    }

    if (application.status !== 'shortlisted') {
        res.status(403);
        throw new Error('Identity can be revealed only for shortlisted candidates');
    }

    res.json({
        anonymousId: application.anonymousId,
        privateProfile: application.privateProfile,
    });
};

module.exports = {
    getJobApplications,
    updateApplicationStatus,
    generateJobTest,
    updateRecruiterProfile,
    revealIdentity,
};
