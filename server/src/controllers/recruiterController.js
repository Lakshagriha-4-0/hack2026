const Application = require('../models/Application');
const Job = require('../models/Job');

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
        .select('-privateProfile') // Explicitly exclude private profile
        .sort('-matchScore')
        .lean();

    res.json(applications);
};

// @desc    Shortlist/Reject an application
// @route   PUT /api/recruiter/applications/:appId/status
// @access  Private/Recruiter
const updateApplicationStatus = async (req, res) => {
    const { status } = req.body;
    const application = await Application.findById(req.params.appId);

    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }

    if (application.recruiterId.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized');
    }

    application.status = status;
    await application.save();

    res.json(application);
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
        throw new Error('You can only reveal identity of shortlisted candidates');
    }

    res.json({
        anonymousId: application.anonymousId,
        privateProfile: application.privateProfile,
    });
};

module.exports = { getJobApplications, updateApplicationStatus, revealIdentity };
