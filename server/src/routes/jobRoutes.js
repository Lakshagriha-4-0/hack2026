const express = require('express');
const router = express.Router();
const { createJob, getJobs, getMyJobs, getJobById } = require('../controllers/jobController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(getJobs)
    .post(protect, authorize('recruiter'), createJob);

router.route('/mine').get(protect, authorize('recruiter'), getMyJobs);
router.route('/:id').get(getJobById);

module.exports = router;
