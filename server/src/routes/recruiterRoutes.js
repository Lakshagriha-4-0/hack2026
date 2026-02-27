const express = require('express');
const router = express.Router();
const {
    getJobApplications,
    updateApplicationStatus,
    generateJobTest,
    updateRecruiterProfile,
    revealIdentity,
} = require('../controllers/recruiterController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/jobs/:jobId/applications', protect, authorize('recruiter'), getJobApplications);
router.put('/applications/:appId/status', protect, authorize('recruiter'), updateApplicationStatus);
router.post('/jobs/test/generate', protect, authorize('recruiter'), generateJobTest);
router.put('/profile', protect, authorize('recruiter'), updateRecruiterProfile);
router.get('/applications/:appId/reveal', protect, authorize('recruiter'), revealIdentity);

module.exports = router;
