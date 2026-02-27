const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const calcMatchScore = require('../utils/calcMatchScore');
const logger = require('../utils/logger');
const generateCandidateId = require('../utils/generateCandidateId');
const {
    extractResumeText,
    extractDetailsFromResume,
    buildBiasResumePreview,
} = require('../utils/resumeUtils');
const fs = require('fs');

// @desc    Update candidate profile
// @route   PUT /api/candidate/profile
// @access  Private/Candidate
const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { personal, public: publicData } = req.body;

        const existingPersonal = user.candidateProfile?.personal
            ? user.candidateProfile.personal.toObject
                ? user.candidateProfile.personal.toObject()
                : user.candidateProfile.personal
            : {};
        const existingPublic = user.candidateProfile?.public
            ? user.candidateProfile.public.toObject
                ? user.candidateProfile.public.toObject()
                : user.candidateProfile.public
            : {};

        const nextProfile = {
            personal: existingPersonal,
            public: existingPublic,
        };

        if (personal) {
            nextProfile.personal = {
                ...existingPersonal,
                ...personal,
            };
        }

        if (publicData) {
            nextProfile.public = {
                ...existingPublic,
                ...publicData,
            };
        }

        // Clean up any potential nulls in arrays if they exist
        if (nextProfile.public.projects) nextProfile.public.projects = nextProfile.public.projects.filter(Boolean);
        if (nextProfile.public.education) nextProfile.public.education = nextProfile.public.education.filter(Boolean);
        if (nextProfile.public.experience) nextProfile.public.experience = nextProfile.public.experience.filter(Boolean);

        user.candidateProfile = nextProfile;
        user.markModified('candidateProfile');

        const updatedUser = await user.save();
        logger.inf('profile.update.success', { userId: updatedUser._id });

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            candidatePublicId: updatedUser.candidatePublicId,
            candidateProfile: updatedUser.candidateProfile,
        });
    } catch (error) {
        logger.err('profile.update.fail', error, { userId: req.user?._id });
        res.status(500).json({
            message: 'Profile update failed. Please check if all fields are valid.',
            error: error.message
        });
    }
};

// @desc    Upload resume, extract and auto-fill profile
// @route   POST /api/candidate/profile/resume
// @access  Private/Candidate
const uploadResume = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Resume file is required' });
        }

        const lowerName = (req.file.originalname || '').toLowerCase();
        const allowed =
            req.file.mimetype.includes('pdf') ||
            req.file.mimetype.includes('text/plain') ||
            req.file.mimetype.includes('officedocument.wordprocessingml') ||
            lowerName.endsWith('.pdf') ||
            lowerName.endsWith('.docx') ||
            lowerName.endsWith('.txt');
        if (!allowed) {
            return res.status(400).json({ message: 'Only PDF, DOCX, or TXT resumes are allowed' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const text = await extractResumeText(req.file);
        const extractedRaw = await extractDetailsFromResume(text);
        const extracted = {
            personal: extractedRaw?.personal || {},
            public: extractedRaw?.public || { skills: [], experienceYears: 0 },
        };

        const existingPersonal = user.candidateProfile?.personal?.toObject
            ? user.candidateProfile.personal.toObject()
            : user.candidateProfile?.personal || {};
        const existingPublic = user.candidateProfile?.public?.toObject
            ? user.candidateProfile.public.toObject()
            : user.candidateProfile?.public || {};

        // Replace previous uploaded resume file with the new one.
        const previousResumePath = existingPersonal?.resumeOriginal?.storagePath;
        if (previousResumePath && previousResumePath !== req.file.path && fs.existsSync(previousResumePath)) {
            try {
                fs.unlinkSync(previousResumePath);
            } catch (cleanupError) {
                logger.wrn('profile.resume.cleanup.fail', { e: cleanupError.message });
            }
        }

        const mergedSkills = Array.from(
            new Set([...(existingPublic.skills || []), ...(extracted.public.skills || [])])
        );

        const mergeObjectsByKey = (existingList = [], newList = [], keyBuilder) => {
            const map = new Map();
            [...existingList, ...newList].forEach((item) => {
                const key = keyBuilder(item);
                if (!key) return;
                if (!map.has(key)) {
                    map.set(key, item);
                }
            });
            return Array.from(map.values());
        };

        const mergedProjects = mergeObjectsByKey(
            existingPublic.projects || [],
            extracted.public.projects || [],
            (p) => `${String(p?.title || '').toLowerCase()}|${String(p?.link || '').toLowerCase()}`
        );
        const mergedEducation = mergeObjectsByKey(
            existingPublic.education || [],
            extracted.public.education || [],
            (e) => `${String(e?.school || '').toLowerCase()}|${String(e?.degree || '').toLowerCase()}`
        );
        const mergedExperience = mergeObjectsByKey(
            existingPublic.experience || [],
            extracted.public.experience || [],
            (x) => `${String(x?.company || '').toLowerCase()}|${String(x?.role || '').toLowerCase()}`
        );

        const nextPersonal = {
            ...existingPersonal,
            fullName: existingPersonal.fullName || extracted.personal.fullName || user.name,
            email: existingPersonal.email || extracted.personal.email || user.email,
            phone: existingPersonal.phone || extracted.personal.phone || '',
            gender: existingPersonal.gender || extracted.personal.gender || '',
            college: existingPersonal.college || extracted.personal.college || '',
            address: existingPersonal.address || extracted.personal.address || '',
            bio: existingPersonal.bio || extracted.personal.bio || '',
            githubLink: existingPersonal.githubLink || extracted.personal.githubLink || '',
            linkedinLink: existingPersonal.linkedinLink || extracted.personal.linkedinLink || '',
            currentRole: existingPersonal.currentRole || extracted.personal.currentRole || '',
            currentCompany: existingPersonal.currentCompany || extracted.personal.currentCompany || '',
            resumeOriginal: {
                fileName: req.file.originalname,
                storagePath: req.file.path || '',
                mimeType: req.file.mimetype,
                size: req.file.size,
                uploadedAt: new Date(),
                text,
            },
        };

        const previewText = await buildBiasResumePreview({
            rawText: text,
            personal: nextPersonal,
            extracted,
            publicData: { ...existingPublic, skills: mergedSkills },
        });

        const nextPublic = {
            ...existingPublic,
            skills: mergedSkills,
            experienceYears: existingPublic.experienceYears || extracted.public.experienceYears || 0,
            tagline: existingPublic.tagline || extracted.public.tagline || '',
            projects: mergedProjects,
            education: mergedEducation,
            experience: mergedExperience,
            portfolioLink: existingPublic.portfolioLink || extracted.public.portfolioLink || '',
            city: existingPublic.city || extracted.public.city || '',
            resumeAnonymized: {
                text: previewText,
                updatedAt: new Date(),
            },
        };

        user.candidateProfile = { personal: nextPersonal, public: nextPublic };
        user.markModified('candidateProfile');
        await user.save();

        const updatedFields = [];
        const changed = (before, after) => String(before || '').trim() !== String(after || '').trim();
        if (changed(existingPersonal.fullName, nextPersonal.fullName)) updatedFields.push('fullName');
        if (changed(existingPersonal.email, nextPersonal.email)) updatedFields.push('email');
        if (changed(existingPersonal.phone, nextPersonal.phone)) updatedFields.push('phone');
        if (changed(existingPersonal.gender, nextPersonal.gender)) updatedFields.push('gender');
        if (changed(existingPersonal.college, nextPersonal.college)) updatedFields.push('college');
        if (changed(existingPersonal.address, nextPersonal.address)) updatedFields.push('address');
        if (changed(existingPersonal.bio, nextPersonal.bio)) updatedFields.push('bio');
        if (changed(existingPersonal.githubLink, nextPersonal.githubLink)) updatedFields.push('githubLink');
        if (changed(existingPersonal.linkedinLink, nextPersonal.linkedinLink)) updatedFields.push('linkedinLink');
        if (changed(existingPersonal.currentRole, nextPersonal.currentRole)) updatedFields.push('currentRole');
        if (changed(existingPersonal.currentCompany, nextPersonal.currentCompany)) updatedFields.push('currentCompany');
        if ((mergedSkills || []).length > (existingPublic.skills || []).length) updatedFields.push('skills');
        if (Number(nextPublic.experienceYears || 0) !== Number(existingPublic.experienceYears || 0)) updatedFields.push('experienceYears');
        if (changed(existingPublic.tagline, nextPublic.tagline)) updatedFields.push('tagline');
        if ((mergedProjects || []).length > (existingPublic.projects || []).length) updatedFields.push('projects');
        if ((mergedEducation || []).length > (existingPublic.education || []).length) updatedFields.push('education');
        if ((mergedExperience || []).length > (existingPublic.experience || []).length) updatedFields.push('experience');
        if (changed(existingPublic.portfolioLink, nextPublic.portfolioLink)) updatedFields.push('portfolioLink');
        if (changed(existingPublic.city, nextPublic.city)) updatedFields.push('city');
        const autoFilledCount = updatedFields.length;

        res.json({
            message:
                autoFilledCount > 0
                    ? 'Resume uploaded, profile auto-filled, and saved'
                    : 'Resume uploaded and saved. You can edit fields manually.',
            autoFilledCount,
            updatedFields,
            candidateProfile: user.candidateProfile,
            extracted: {
                fullName: extracted.personal.fullName,
                email: extracted.personal.email,
                phone: extracted.personal.phone,
                skills: extracted.public.skills,
                experienceYears: extracted.public.experienceYears,
            },
        });
    } catch (error) {
        logger.err('profile.resume.fail', error, { userId: req.user?._id });
        res.status(500).json({ message: error.message || 'Resume upload failed' });
    }
};

// @desc    Download original uploaded resume
// @route   GET /api/candidate/profile/resume/download
// @access  Private/Candidate
const downloadResume = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const resume = user.candidateProfile?.personal?.resumeOriginal;
        if (!resume?.storagePath || !fs.existsSync(resume.storagePath)) {
            return res.status(404).json({ message: 'No uploaded resume found' });
        }

        return res.download(resume.storagePath, resume.fileName || 'resume');
    } catch (error) {
        logger.err('profile.resume.download.fail', error, { userId: req.user?._id });
        return res.status(500).json({ message: 'Failed to download resume' });
    }
};

// @desc    Upload profile photo
// @route   POST /api/candidate/profile/photo
// @access  Private/Candidate
const uploadProfilePhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Photo file is required' });
        }

        if (!req.file.mimetype.startsWith('image/')) {
            return res.status(400).json({ message: 'Only image files are allowed' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const existingPersonal = user.candidateProfile?.personal?.toObject
            ? user.candidateProfile.personal.toObject()
            : user.candidateProfile?.personal || {};
        const existingPublic = user.candidateProfile?.public?.toObject
            ? user.candidateProfile.public.toObject()
            : user.candidateProfile?.public || {};

        const base64 = req.file.buffer.toString('base64');
        const profilePic = `data:${req.file.mimetype};base64,${base64}`;

        user.candidateProfile = {
            personal: {
                ...existingPersonal,
                profilePic,
            },
            public: existingPublic,
        };
        user.markModified('candidateProfile');
        await user.save();

        res.json({
            message: 'Profile photo uploaded',
            profilePic,
        });
    } catch (error) {
        logger.err('profile.photo.fail', error, { userId: req.user?._id });
        res.status(500).json({ message: 'Photo upload failed' });
    }
};

const getOrCreateCandidatePublicId = async (user) => {
    if (user.candidatePublicId) return user.candidatePublicId;

    user.candidatePublicId = generateCandidateId(user._id?.toString() || '');
    await user.save();
    return user.candidatePublicId;
};

// @desc    Apply to a job
// @route   POST /api/jobs/:jobId/apply
// @access  Private/Candidate
const applyToJob = async (req, res) => {
    const job = await Job.findById(req.params.jobId);

    if (!job) {
        res.status(404);
        throw new Error('Job not found');
    }

    const alreadyApplied = await Application.findOne({
        jobId: job._id,
        candidateId: req.user._id,
    });

    if (alreadyApplied) {
        res.status(400);
        throw new Error('Already applied for this job');
    }

    const user = await User.findById(req.user._id);
    const candidatePublicProfile = user?.candidateProfile?.public || {};
    const candidatePersonalProfile = user?.candidateProfile?.personal || {};

    const candidateSkills = Array.isArray(candidatePublicProfile.skills)
        ? candidatePublicProfile.skills
        : [];

    const { score, matchedSkills, missingSkills } = calcMatchScore(
        job.requiredSkills,
        candidateSkills
    );

    const candidatePublicId = user.candidatePublicId || (await getOrCreateCandidatePublicId(user));
    const application = new Application({
        jobId: job._id,
        recruiterId: job.recruiterId,
        candidateId: user._id,
        anonymousId: candidatePublicId,
        candidatePublicId,
        matchScore: score,
        matchedSkills,
        missingSkills,
        displayProfile: {
            skills: candidatePublicProfile.skills || [],
            experienceYears: candidatePublicProfile.experienceYears || 0,
            projects: candidatePublicProfile.projects || [],
            education: candidatePublicProfile.education || [],
            experience: candidatePublicProfile.experience || [],
            portfolioLink: candidatePublicProfile.portfolioLink || '',
            city: candidatePublicProfile.city || '',
            tagline: candidatePublicProfile.tagline || '',
            resumeAnonymizedText: candidatePublicProfile?.resumeAnonymized?.text || '',
        },
        privateProfile: candidatePersonalProfile,
    });

    const createdApplication = await application.save();
    res.status(201).json(createdApplication);
};

// @desc    Get candidate's applications
// @route   GET /api/candidate/applications
// @access  Private/Candidate
const getMyApplications = async (req, res) => {
    const applications = await Application.find({ candidateId: req.user._id })
        .select('jobId status createdAt matchScore')
        .populate({ path: 'jobId', select: 'title description location', options: { lean: true } })
        .sort('-createdAt')
        .lean();
    res.json(applications);
};

// @desc    Auto-fill profile from already uploaded resume
// @route   POST /api/candidate/profile/auto-fill
// @access  Private/Candidate
const autoFillProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let resume = user.candidateProfile?.personal?.resumeOriginal;
        if (!resume) {
            return res.status(400).json({ message: 'No uploaded resume found. Please upload a resume first.' });
        }

        let text = resume.text;
        if (!text && resume.storagePath && fs.existsSync(resume.storagePath)) {
            try {
                logger.inf('profile.autofill.re-extracting', { path: resume.storagePath });
                text = await extractResumeText({ path: resume.storagePath, originalname: resume.fileName, mimetype: resume.mimeType });
                if (text) {
                    resume.text = text;
                    user.markModified('candidateProfile');
                }
            } catch (extractError) {
                logger.wrn('profile.autofill.re-extract.fail', { e: extractError.message });
            }
        }

        if (!text) {
            return res.status(400).json({ message: 'No resume text found or extraction failed. Please try re-uploading your resume.' });
        }

        const extractedRaw = await extractDetailsFromResume(text);
        const extracted = {
            personal: extractedRaw?.personal || {},
            public: extractedRaw?.public || { skills: [], experienceYears: 0 },
        };

        const existingPersonal = user.candidateProfile?.personal?.toObject
            ? user.candidateProfile.personal.toObject()
            : user.candidateProfile?.personal || {};
        const existingPublic = user.candidateProfile?.public?.toObject
            ? user.candidateProfile.public.toObject()
            : user.candidateProfile?.public || {};

        const mergedSkills = Array.from(
            new Set([...(existingPublic.skills || []), ...(extracted.public.skills || [])])
        );

        const mergeObjectsByKey = (existingList = [], newList = [], keyBuilder) => {
            const map = new Map();
            [...existingList, ...newList].forEach((item) => {
                const key = keyBuilder(item);
                if (!key) return;
                if (!map.has(key)) {
                    map.set(key, item);
                }
            });
            return Array.from(map.values());
        };

        const mergedProjects = mergeObjectsByKey(
            existingPublic.projects || [],
            extracted.public.projects || [],
            (p) => `${String(p?.title || '').toLowerCase()}|${String(p?.link || '').toLowerCase()}`
        );
        const mergedEducation = mergeObjectsByKey(
            existingPublic.education || [],
            extracted.public.education || [],
            (e) => `${String(e?.school || '').toLowerCase()}|${String(e?.degree || '').toLowerCase()}`
        );
        const mergedExperience = mergeObjectsByKey(
            existingPublic.experience || [],
            extracted.public.experience || [],
            (x) => `${String(x?.company || '').toLowerCase()}|${String(x?.role || '').toLowerCase()}`
        );

        const nextPersonal = {
            ...existingPersonal,
            fullName: existingPersonal.fullName || extracted.personal.fullName || user.name,
            email: existingPersonal.email || extracted.personal.email || user.email,
            phone: existingPersonal.phone || extracted.personal.phone || '',
            gender: existingPersonal.gender || extracted.personal.gender || '',
            college: existingPersonal.college || extracted.personal.college || '',
            address: existingPersonal.address || extracted.personal.address || '',
            bio: existingPersonal.bio || extracted.personal.bio || '',
            githubLink: existingPersonal.githubLink || extracted.personal.githubLink || '',
            linkedinLink: existingPersonal.linkedinLink || extracted.personal.linkedinLink || '',
            currentRole: existingPersonal.currentRole || extracted.personal.currentRole || '',
            currentCompany: existingPersonal.currentCompany || extracted.personal.currentCompany || '',
        };

        const previewText = await buildBiasResumePreview({
            rawText: resume.text,
            personal: nextPersonal,
            extracted,
            publicData: { ...existingPublic, skills: mergedSkills },
        });

        const nextPublic = {
            ...existingPublic,
            skills: mergedSkills,
            experienceYears: existingPublic.experienceYears || extracted.public.experienceYears || 0,
            tagline: existingPublic.tagline || extracted.public.tagline || '',
            projects: mergedProjects,
            education: mergedEducation,
            experience: mergedExperience,
            portfolioLink: existingPublic.portfolioLink || extracted.public.portfolioLink || '',
            city: existingPublic.city || extracted.public.city || '',
            resumeAnonymized: {
                text: previewText,
                updatedAt: new Date(),
            },
        };

        user.candidateProfile = { personal: nextPersonal, public: nextPublic };
        user.markModified('candidateProfile');
        await user.save();

        res.json({
            message: 'Profile auto-filled from existing resume',
            candidateProfile: user.candidateProfile,
            extracted,
        });
    } catch (error) {
        logger.err('profile.autofill.fail', error, { userId: req.user?._id });
        res.status(500).json({ message: error.message || 'Auto-fill failed' });
    }
};

module.exports = {
    updateProfile,
    uploadResume,
    downloadResume,
    uploadProfilePhoto,
    applyToJob,
    getMyApplications,
    autoFillProfile,
};
