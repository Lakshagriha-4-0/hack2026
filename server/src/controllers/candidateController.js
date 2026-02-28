const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const EligibilityTest = require('../models/EligibilityTest');
const calcMatchScore = require('../utils/calcMatchScore');
const logger = require('../utils/logger');
const generateCandidateId = require('../utils/generateCandidateId');
const { generateEligibilityQuestions, evaluateAnswers } = require('../utils/eligibilityTestUtils');
const {
    extractResumeText,
    extractDetailsFromResume,
    buildBiasResumePreview,
} = require('../utils/resumeUtils');
const fs = require('fs');

const isJobExpired = (job) => {
    if (!job) return true;
    if (job.status === 'expired') return true;
    return Boolean(job.deadlineAt && new Date(job.deadlineAt) <= new Date());
};

const normalizeQuestionIds = (questions = [], prefix = 'q') => {
    const used = new Set();
    return (questions || []).map((q, idx) => {
        let id = String(q?.questionId || `${prefix}${idx + 1}`).trim() || `${prefix}${idx + 1}`;
        if (used.has(id)) {
            id = `${prefix}${idx + 1}`;
        }
        let counter = 1;
        while (used.has(id)) {
            id = `${prefix}${idx + 1}_${counter}`;
            counter += 1;
        }
        used.add(id);
        return {
            ...q,
            questionId: id,
        };
    });
};

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
            fullName: extracted.personal.fullName || existingPersonal.fullName || user.name,
            email: extracted.personal.email || existingPersonal.email || user.email,
            phone: extracted.personal.phone || existingPersonal.phone || '',
            gender: extracted.personal.gender || existingPersonal.gender || '',
            college: extracted.personal.college || existingPersonal.college || '',
            address: extracted.personal.address || existingPersonal.address || '',
            bio: extracted.personal.bio || existingPersonal.bio || '',
            githubLink: extracted.personal.githubLink || existingPersonal.githubLink || '',
            linkedinLink: extracted.personal.linkedinLink || existingPersonal.linkedinLink || '',
            currentRole: extracted.personal.currentRole || existingPersonal.currentRole || '',
            currentCompany: extracted.personal.currentCompany || existingPersonal.currentCompany || '',
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
            experienceYears: extracted.public.experienceYears || existingPublic.experienceYears || 0,
            tagline: extracted.public.tagline || existingPublic.tagline || '',
            projects: mergedProjects,
            education: mergedEducation,
            experience: mergedExperience,
            portfolioLink: extracted.public.portfolioLink || existingPublic.portfolioLink || '',
            city: extracted.public.city || existingPublic.city || '',
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

const createApplicationRecord = async ({ job, user }) => {
    const candidatePublicProfile = user?.candidateProfile?.public || {};
    const candidatePersonalProfile = user?.candidateProfile?.personal || {};
    const candidateSkills = Array.isArray(candidatePublicProfile.skills) ? candidatePublicProfile.skills : [];

    const { score, matchedSkills, missingSkills } = calcMatchScore(job.requiredSkills, candidateSkills);
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
        status: 'shortlisted',
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

    return application.save();
};

// @desc    Get jobs suitable for candidate skills
// @route   GET /api/candidate/jobs/suitable
// @access  Private/Candidate
const getSuitableJobs = async (req, res) => {
    const user = await User.findById(req.user._id).select('candidateProfile.public.skills').lean();
    const candidateSkills = Array.isArray(user?.candidateProfile?.public?.skills)
        ? user.candidateProfile.public.skills
        : [];
    const appliedJobIds = await Application.find({ candidateId: req.user._id })
        .select('jobId')
        .lean()
        .then((rows) => rows.map((row) => row.jobId).filter(Boolean));

    const jobsQuery = { status: 'active', deadlineAt: { $gt: new Date() } };
    if (appliedJobIds.length) {
        jobsQuery._id = { $nin: appliedJobIds };
    }

    const jobs = await Job.find(jobsQuery)
        .select('recruiterId title description requiredSkills experienceLevel location salaryRange createdAt deadlineAt status')
        .populate('recruiterId', 'name email')
        .lean();

    const suitedJobs = jobs
        .map((job) => {
            const { score, matchedSkills, missingSkills } = calcMatchScore(job.requiredSkills, candidateSkills);
            return {
                ...job,
                matchScore: score,
                matchedSkills,
                missingSkills,
            };
        })
        .sort((a, b) => b.matchScore - a.matchScore);

    res.json(suitedJobs);
};

// @desc    Start eligibility test for a job
// @route   POST /api/candidate/eligibility/:jobId/start
// @access  Private/Candidate
const startEligibilityTest = async (req, res) => {
    const job = await Job.findById(req.params.jobId).select('title requiredSkills deadlineAt status').lean();
    if (!job) {
        return res.status(404).json({ message: 'Job not found' });
    }
    if (isJobExpired(job)) {
        return res.status(410).json({ message: 'This job has expired' });
    }

    const existingTest = await EligibilityTest.findOne({
        candidateId: req.user._id,
        jobId: job._id,
    }).lean();
    if (existingTest) {
        if (existingTest.status === 'failed') {
            return res.status(403).json({
                message: 'Eligibility test already failed. Reattempt is not allowed for this job.',
            });
        }

        if (existingTest.status === 'passed') {
            return res.json({
                jobId: existingTest.jobId,
                status: existingTest.status,
                score: existingTest.score,
                passScore: existingTest.passScore,
                submittedAt: existingTest.submittedAt,
                questions: undefined,
            });
        }

        if (existingTest.status === 'pending' && Array.isArray(existingTest.questions) && existingTest.questions.length) {
            return res.json({
                jobId: existingTest.jobId,
                status: existingTest.status,
                score: existingTest.score,
                passScore: existingTest.passScore,
                submittedAt: existingTest.submittedAt,
                questions: existingTest.questions.map((q) => ({
                    questionId: q.questionId,
                    question: q.question,
                    options: q.options,
                })),
            });
        }
    }

    const { generatedBy, questions } = await generateEligibilityQuestions(job);
    if (!questions.length) {
        return res.status(500).json({ message: 'Failed to generate eligibility test' });
    }

    const test = await EligibilityTest.findOneAndUpdate(
        { candidateId: req.user._id, jobId: job._id },
        {
            $set: {
                requiredSkillsSnapshot: job.requiredSkills || [],
                questions,
                passScore: 60,
                score: 0,
                status: 'pending',
                answers: [],
                generatedBy,
                submittedAt: null,
            },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    res.json({
        jobId: job._id,
        status: test.status,
        passScore: test.passScore,
        questions: test.questions.map((q) => ({
            questionId: q.questionId,
            question: q.question,
            options: q.options,
        })),
    });
};

// @desc    Get eligibility test status for a job
// @route   GET /api/candidate/eligibility/:jobId
// @access  Private/Candidate
const getEligibilityStatus = async (req, res) => {
    const test = await EligibilityTest.findOne({
        candidateId: req.user._id,
        jobId: req.params.jobId,
    }).lean();

    if (!test) {
        return res.status(404).json({ message: 'Eligibility test not started' });
    }

    res.json({
        jobId: test.jobId,
        status: test.status,
        score: test.score,
        passScore: test.passScore,
        submittedAt: test.submittedAt,
        questions: test.status === 'pending'
            ? test.questions.map((q) => ({
                questionId: q.questionId,
                question: q.question,
                options: q.options,
            }))
            : undefined,
    });
};

// @desc    Submit eligibility test answers
// @route   POST /api/candidate/eligibility/:jobId/submit
// @access  Private/Candidate
const submitEligibilityTest = async (req, res) => {
    const { answers } = req.body;
    if (!Array.isArray(answers) || !answers.length) {
        return res.status(400).json({ message: 'Answers are required' });
    }

    const test = await EligibilityTest.findOne({
        candidateId: req.user._id,
        jobId: req.params.jobId,
    });
    if (!test) {
        return res.status(404).json({ message: 'Eligibility test not found. Start test first.' });
    }
    if (test.status !== 'pending') {
        return res.status(400).json({
            message:
                test.status === 'failed'
                    ? 'Eligibility test already submitted and failed. Reattempt is not allowed.'
                    : 'Eligibility test already submitted.',
        });
    }

    const { score } = evaluateAnswers(test.questions, answers);
    const passed = score >= test.passScore;

    test.answers = answers
        .map((a) => ({
            questionId: String(a?.questionId || ''),
            answer: String(a?.answer || '').trim(),
        }))
        .filter((a) => a.questionId && a.answer);
    test.score = score;
    test.status = passed ? 'passed' : 'failed';
    test.submittedAt = new Date();
    await test.save();

    res.json({
        jobId: test.jobId,
        status: test.status,
        score: test.score,
        passScore: test.passScore,
        message: passed
            ? 'Eligibility test passed. You can now apply.'
            : 'Eligibility test not passed. Reattempt is not allowed for this job.',
    });
};

// @desc    Get recruiter company test for a job (after eligibility pass)
// @route   GET /api/candidate/company-test/:jobId
// @access  Private/Candidate
const getCompanyTest = async (req, res) => {
    const job = await Job.findById(req.params.jobId)
        .select('recruiterTest requiredSkills title recruiterId deadlineAt status')
        .lean();
    if (!job) {
        return res.status(404).json({ message: 'Job not found' });
    }
    if (isJobExpired(job)) {
        return res.status(410).json({ message: 'This job has expired' });
    }

    const alreadyApplied = await Application.findOne({
        jobId: job._id,
        candidateId: req.user._id,
    }).lean();
    if (alreadyApplied) {
        return res.json({
            status: 'passed',
            score: 100,
            passScore: 100,
            message: 'You already passed all tests and your profile is shared with recruiter.',
        });
    }

    const eligibility = await EligibilityTest.findOne({
        candidateId: req.user._id,
        jobId: job._id,
    });
    if (!eligibility || eligibility.status !== 'passed') {
        return res.status(403).json({ message: 'Pass the first eligibility test before attempting company test' });
    }

    const sourceQuestions = Array.isArray(job?.recruiterTest?.questions) ? job.recruiterTest.questions : [];
    if (!sourceQuestions.length) {
        return res.status(400).json({ message: 'Company test is not configured for this job' });
    }

    let currentRound = eligibility.companyRound || {};
    if (currentRound.status === 'failed') {
        return res.status(403).json({
            status: 'failed',
            score: currentRound.score || 0,
            passScore: currentRound.passScore || Number(job.recruiterTest?.passScore || 60),
            message: 'Company test already failed. Reattempt is not allowed for this job.',
        });
    }

    if (!Array.isArray(currentRound.questions) || !currentRound.questions.length) {
        eligibility.companyRound = {
            questions: sourceQuestions.map((q, idx) => ({
                questionId: `cq${idx + 1}`,
                question: q.question,
                options: q.options || [],
                correctAnswer: q.correctAnswer,
            })),
            passScore: Number(job.recruiterTest?.passScore || 60),
            score: 0,
            status: 'pending',
            answers: [],
            submittedAt: null,
        };
        await eligibility.save();
        currentRound = eligibility.companyRound || {};
    }

    // Backward compatibility: normalize duplicate/blank IDs in old stored rounds.
    if (Array.isArray(currentRound.questions) && currentRound.questions.length) {
        const normalized = normalizeQuestionIds(currentRound.questions, 'cq');
        const changed = normalized.some((q, idx) => q.questionId !== currentRound.questions[idx]?.questionId);
        if (changed) {
            eligibility.companyRound.questions = normalized;
            await eligibility.save();
            currentRound = eligibility.companyRound || {};
        }
    }

    res.json({
        status: currentRound.status,
        score: currentRound.score,
        passScore: currentRound.passScore,
        questions:
            currentRound.status === 'pending'
                ? currentRound.questions.map((q) => ({
                    questionId: q.questionId,
                    question: q.question,
                    options: q.options,
                }))
                : undefined,
        submittedAt: currentRound.submittedAt,
    });
};

// @desc    Submit company test; share candidate with recruiter only if passed
// @route   POST /api/candidate/company-test/:jobId/submit
// @access  Private/Candidate
const submitCompanyTest = async (req, res) => {
    const { answers } = req.body;
    if (!Array.isArray(answers) || !answers.length) {
        return res.status(400).json({ message: 'Answers are required' });
    }

    const job = await Job.findById(req.params.jobId).select('recruiterId requiredSkills recruiterTest deadlineAt status').lean();
    if (!job) {
        return res.status(404).json({ message: 'Job not found' });
    }
    if (isJobExpired(job)) {
        return res.status(410).json({ message: 'This job has expired' });
    }

    const eligibility = await EligibilityTest.findOne({
        candidateId: req.user._id,
        jobId: job._id,
    });
    if (!eligibility || eligibility.status !== 'passed') {
        return res.status(403).json({ message: 'Pass the first eligibility test before attempting company test' });
    }

    const round = eligibility.companyRound || {};
    if (!Array.isArray(round.questions) || !round.questions.length) {
        return res.status(400).json({ message: 'Company test not initialized. Open company test first.' });
    }
    if (round.status && round.status !== 'pending') {
        return res.status(400).json({
            message:
                round.status === 'failed'
                    ? 'Company test already submitted and failed. Reattempt is not allowed.'
                    : 'Company test already submitted.',
        });
    }

    const { score } = evaluateAnswers(round.questions, answers);
    const passed = score >= (round.passScore || 60);

    eligibility.companyRound.answers = answers
        .map((a) => ({
            questionId: String(a?.questionId || '').trim(),
            answer: String(a?.answer || '').trim(),
        }))
        .filter((a) => a.questionId && a.answer);
    eligibility.companyRound.score = score;
    eligibility.companyRound.status = passed ? 'passed' : 'failed';
    eligibility.companyRound.submittedAt = new Date();
    await eligibility.save();

    if (!passed) {
        return res.json({
            status: 'failed',
            score,
            passScore: round.passScore || 60,
            message: 'Company test not passed. Reattempt is not allowed and your profile was not shared with recruiter.',
        });
    }

    const existingApplication = await Application.findOne({
        jobId: job._id,
        candidateId: req.user._id,
    }).lean();
    if (!existingApplication) {
        const user = await User.findById(req.user._id);
        await createApplicationRecord({ job, user });
    }

    return res.json({
        status: 'passed',
        score,
        passScore: round.passScore || 60,
        message: 'Company test passed. Your profile is now shared with recruiter.',
    });
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
    if (isJobExpired(job)) {
        res.status(410);
        throw new Error('This job has expired');
    }

    const alreadyApplied = await Application.findOne({
        jobId: job._id,
        candidateId: req.user._id,
    });

    if (alreadyApplied) {
        res.status(400);
        throw new Error('Already applied for this job');
    }

    const eligibility = await EligibilityTest.findOne({
        candidateId: req.user._id,
        jobId: job._id,
    }).lean();
    if (!eligibility || eligibility.status !== 'passed' || eligibility?.companyRound?.status !== 'passed') {
        res.status(403);
        throw new Error('You must pass both tests before your profile is shared with recruiter');
    }
    const user = await User.findById(req.user._id);
    const createdApplication = await createApplicationRecord({ job, user });
    res.status(201).json(createdApplication);
};

// @desc    Get candidate's applications
// @route   GET /api/candidate/applications
// @access  Private/Candidate
const getMyApplications = async (req, res) => {
    const applications = await Application.find({ candidateId: req.user._id })
        .select('jobId status createdAt matchScore anonymousId candidatePublicId interviewInvite')
        .populate({ path: 'jobId', select: 'title description location', options: { lean: true } })
        .sort('-createdAt')
        .lean();
    res.json(applications);
};

// @desc    Get assigned recruiter work test for candidate application
// @route   GET /api/candidate/applications/:appId/work-test
// @access  Private/Candidate
const getMyWorkTest = async (req, res) => {
    const application = await Application.findOne({
        _id: req.params.appId,
        candidateId: req.user._id,
    })
        .select('jobId status recruiterRoundTest')
        .populate({ path: 'jobId', select: 'title', options: { lean: true } })
        .lean();

    if (!application) {
        return res.status(404).json({ message: 'Application not found' });
    }

    const workTest = application.recruiterRoundTest || {};
    if (!Array.isArray(workTest.questions) || !workTest.questions.length) {
        return res.status(404).json({ message: 'Recruiter work test is not assigned yet' });
    }

    res.json({
        applicationId: application._id,
        job: application.jobId,
        status: application.status,
        reviewStatus: workTest.status,
        score: workTest.score,
        passScore: workTest.passScore,
        questions:
            workTest.status === 'pending'
                ? workTest.questions.map((q) => ({
                    questionId: q.questionId,
                    question: q.question,
                    options: q.options,
                }))
                : undefined,
        submittedAt: workTest.submittedAt,
    });
};

// @desc    Submit response for recruiter work test
// @route   POST /api/candidate/applications/:appId/work-test/submit
// @access  Private/Candidate
const submitMyWorkTest = async (req, res) => {
    const { answers } = req.body;
    if (!Array.isArray(answers) || !answers.length) {
        return res.status(400).json({ message: 'Answers are required' });
    }

    const application = await Application.findOne({
        _id: req.params.appId,
        candidateId: req.user._id,
    });
    if (!application) {
        return res.status(404).json({ message: 'Application not found' });
    }

    if (!Array.isArray(application.recruiterRoundTest?.questions) || !application.recruiterRoundTest.questions.length) {
        return res.status(400).json({ message: 'Recruiter work test is not assigned yet' });
    }
    if (application.recruiterRoundTest.status && application.recruiterRoundTest.status !== 'pending') {
        return res.status(400).json({
            message:
                application.recruiterRoundTest.status === 'failed'
                    ? 'Recruiter work test already submitted and failed. Reattempt is not allowed.'
                    : 'Recruiter work test already submitted.',
        });
    }

    const { score } = evaluateAnswers(application.recruiterRoundTest.questions, answers);
    const passed = score >= (application.recruiterRoundTest.passScore || 60);

    application.recruiterRoundTest.answers = answers
        .map((a) => ({
            questionId: String(a?.questionId || '').trim(),
            answer: String(a?.answer || '').trim(),
        }))
        .filter((a) => a.questionId && a.answer);
    application.recruiterRoundTest.score = score;
    application.recruiterRoundTest.status = passed ? 'passed' : 'failed';
    application.recruiterRoundTest.submittedAt = new Date();
    application.status = passed ? 'shortlisted' : 'rejected';
    await application.save();

    res.json({
        message: passed
            ? 'Recruiter round test passed. You are shortlisted automatically.'
            : 'Recruiter round test not passed. Reattempt is not allowed and application is rejected automatically.',
        reviewStatus: application.recruiterRoundTest.status,
        score: application.recruiterRoundTest.score,
        passScore: application.recruiterRoundTest.passScore,
        status: application.status,
        submittedAt: application.recruiterRoundTest.submittedAt,
    });
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
            fullName: extracted.personal.fullName || existingPersonal.fullName || user.name,
            email: extracted.personal.email || existingPersonal.email || user.email,
            phone: extracted.personal.phone || existingPersonal.phone || '',
            gender: extracted.personal.gender || existingPersonal.gender || '',
            college: extracted.personal.college || existingPersonal.college || '',
            address: extracted.personal.address || existingPersonal.address || '',
            bio: extracted.personal.bio || existingPersonal.bio || '',
            githubLink: extracted.personal.githubLink || existingPersonal.githubLink || '',
            linkedinLink: extracted.personal.linkedinLink || existingPersonal.linkedinLink || '',
            currentRole: extracted.personal.currentRole || existingPersonal.currentRole || '',
            currentCompany: extracted.personal.currentCompany || existingPersonal.currentCompany || '',
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
            experienceYears: extracted.public.experienceYears || existingPublic.experienceYears || 0,
            tagline: extracted.public.tagline || existingPublic.tagline || '',
            projects: mergedProjects,
            education: mergedEducation,
            experience: mergedExperience,
            portfolioLink: extracted.public.portfolioLink || existingPublic.portfolioLink || '',
            city: extracted.public.city || existingPublic.city || '',
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
};
