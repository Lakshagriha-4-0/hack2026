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

    const allowedStatuses = ['shortlisted', 'rejected', 'accepted'];
    if (!allowedStatuses.includes(status)) {
        res.status(400);
        throw new Error('Invalid status');
    }

    if (status === 'accepted' && application.recruiterWorkTest?.reviewStatus !== 'passed') {
        res.status(400);
        throw new Error('Candidate can be accepted only after passing recruiter work test');
    }

    application.status = status;
    await application.save();

    res.json(application);
};

// @desc    Assign recruiter round work test
// @route   POST /api/recruiter/applications/:appId/work-test
// @access  Private/Recruiter
const assignWorkTest = async (req, res) => {
    const { prompt } = req.body;
    if (!String(prompt || '').trim()) {
        res.status(400);
        throw new Error('Work test prompt is required');
    }

    const application = await Application.findById(req.params.appId);
    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }

    if (application.recruiterId.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized');
    }

    if (application.status !== 'shortlisted') {
        res.status(400);
        throw new Error('Work test can be assigned only to shortlisted candidates');
    }

    application.recruiterWorkTest = {
        prompt: String(prompt).trim(),
        assignedAt: new Date(),
        candidateResponse: '',
        submittedAt: null,
        reviewStatus: 'assigned',
        recruiterFeedback: '',
        reviewedAt: null,
    };
    await application.save();

    res.json({
        message: 'Work test assigned',
        recruiterWorkTest: application.recruiterWorkTest,
    });
};

// @desc    Review recruiter work test response
// @route   PUT /api/recruiter/applications/:appId/work-test/review
// @access  Private/Recruiter
const reviewWorkTest = async (req, res) => {
    const { reviewStatus, feedback } = req.body;
    if (!['passed', 'failed'].includes(reviewStatus)) {
        res.status(400);
        throw new Error('Review status must be passed or failed');
    }

    const application = await Application.findById(req.params.appId);
    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }

    if (application.recruiterId.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized');
    }

    if (!application.recruiterWorkTest?.prompt) {
        res.status(400);
        throw new Error('Work test is not assigned');
    }

    if (!application.recruiterWorkTest?.candidateResponse) {
        res.status(400);
        throw new Error('Candidate has not submitted work test yet');
    }

    application.recruiterWorkTest.reviewStatus = reviewStatus;
    application.recruiterWorkTest.recruiterFeedback = String(feedback || '').trim();
    application.recruiterWorkTest.reviewedAt = new Date();
    if (reviewStatus === 'failed') {
        application.status = 'rejected';
    }
    await application.save();

    res.json({
        message: 'Work test reviewed',
        status: application.status,
        recruiterWorkTest: application.recruiterWorkTest,
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

    if (application.status !== 'accepted') {
        res.status(403);
        throw new Error('Identity can be revealed only for accepted candidates');
    }

    res.json({
        anonymousId: application.anonymousId,
        privateProfile: application.privateProfile,
    });
};

module.exports = {
    getJobApplications,
    updateApplicationStatus,
    assignWorkTest,
    reviewWorkTest,
    revealIdentity,
};
