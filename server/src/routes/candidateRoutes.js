const express = require('express');
const router = express.Router();
const {
    updateProfile,
    uploadResume,
    downloadResume,
    uploadProfilePhoto,
    applyToJob,
    getMyApplications,
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
router.get('/applications', protect, authorize('candidate'), getMyApplications);
router.post('/apply/:jobId', protect, authorize('candidate'), applyToJob);

module.exports = router;
