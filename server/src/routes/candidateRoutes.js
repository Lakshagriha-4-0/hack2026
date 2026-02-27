const express = require('express');
const router = express.Router();
const {
    updateProfile,
    uploadResume,
    downloadResume,
    uploadProfilePhoto,
    getSuitableJobs,
    startEligibilityTest,
    getEligibilityStatus,
    submitEligibilityTest,
    getCompanyTest,
    submitCompanyTest,
    applyToJob,
    getMyApplications,
    getMyWorkTest,
    submitMyWorkTest,
    autoFillProfile,
} = require('../controllers/candidateController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const resumeUpload = require('../middleware/resumeUploadMiddleware');

router.put('/profile', protect, authorize('candidate'), updateProfile);
router.post('/profile/resume', protect, authorize('candidate'), resumeUpload.single('resume'), uploadResume);
router.post('/profile/auto-fill', protect, authorize('candidate'), autoFillProfile);
router.get('/profile/resume/download', protect, authorize('candidate'), downloadResume);
router.post('/profile/photo', protect, authorize('candidate'), upload.single('photo'), uploadProfilePhoto);
router.get('/jobs/suitable', protect, authorize('candidate'), getSuitableJobs);
router.post('/eligibility/:jobId/start', protect, authorize('candidate'), startEligibilityTest);
router.get('/eligibility/:jobId', protect, authorize('candidate'), getEligibilityStatus);
router.post('/eligibility/:jobId/submit', protect, authorize('candidate'), submitEligibilityTest);
router.get('/company-test/:jobId', protect, authorize('candidate'), getCompanyTest);
router.post('/company-test/:jobId/submit', protect, authorize('candidate'), submitCompanyTest);
router.get('/applications', protect, authorize('candidate'), getMyApplications);
router.get('/applications/:appId/work-test', protect, authorize('candidate'), getMyWorkTest);
router.post('/applications/:appId/work-test/submit', protect, authorize('candidate'), submitMyWorkTest);
router.post('/apply/:jobId', protect, authorize('candidate'), applyToJob);

module.exports = router;
