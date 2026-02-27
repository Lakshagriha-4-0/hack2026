const express = require('express');
const router = express.Router();
const {
    getJobApplications,
    updateApplicationStatus,
    assignWorkTest,
    reviewWorkTest,
    revealIdentity,
} = require('../controllers/recruiterController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/jobs/:jobId/applications', protect, authorize('recruiter'), getJobApplications);
router.put('/applications/:appId/status', protect, authorize('recruiter'), updateApplicationStatus);
router.post('/applications/:appId/work-test', protect, authorize('recruiter'), assignWorkTest);
router.put('/applications/:appId/work-test/review', protect, authorize('recruiter'), reviewWorkTest);
router.get('/applications/:appId/reveal', protect, authorize('recruiter'), revealIdentity);

module.exports = router;
