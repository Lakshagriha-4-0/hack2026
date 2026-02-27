const express = require('express');
const router = express.Router();
const { getJobApplications, updateApplicationStatus, revealIdentity } = require('../controllers/recruiterController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/jobs/:jobId/applications', protect, authorize('recruiter'), getJobApplications);
router.put('/applications/:appId/status', protect, authorize('recruiter'), updateApplicationStatus);
router.get('/applications/:appId/reveal', protect, authorize('recruiter'), revealIdentity);

module.exports = router;
