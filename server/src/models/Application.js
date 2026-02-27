const mongoose = require('mongoose');

const applicationSchema = mongoose.Schema(
    {
        jobId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Job',
            index: true,
        },
        recruiterId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
            index: true,
        },
        candidateId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
            index: true,
        },
        anonymousId: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        candidatePublicId: {
            type: String,
            trim: true,
            default: '',
            index: true,
        },
        matchScore: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
        matchedSkills: {
            type: [String],
            default: [],
            set: (skills) =>
                Array.isArray(skills)
                    ? skills.map((skill) => String(skill).trim()).filter(Boolean)
                    : [],
        },
        missingSkills: {
            type: [String],
            default: [],
            set: (skills) =>
                Array.isArray(skills)
                    ? skills.map((skill) => String(skill).trim()).filter(Boolean)
                    : [],
        },
        status: {
            type: String,
            enum: ['applied', 'shortlisted', 'rejected'],
            default: 'applied',
            index: true,
        },
        displayProfile: {
            skills: {
                type: [String],
                default: [],
                set: (skills) =>
                    Array.isArray(skills)
                        ? skills.map((skill) => String(skill).trim()).filter(Boolean)
                        : [],
            },
            experienceYears: {
                type: Number,
                min: 0,
                max: 60,
                default: 0,
            },
            projects: [
                {
                    title: { type: String, trim: true, default: '' },
                    description: { type: String, trim: true, default: '' },
                    link: { type: String, trim: true, default: '' },
                },
            ],
            education: [
                {
                    school: { type: String, trim: true, default: '' },
                    degree: { type: String, trim: true, default: '' },
                    fieldOfStudy: { type: String, trim: true, default: '' },
                    startYear: { type: Number },
                    endYear: { type: Number },
                },
            ],
            experience: [
                {
                    company: { type: String, trim: true, default: '' },
                    role: { type: String, trim: true, default: '' },
                    location: { type: String, trim: true, default: '' },
                    description: { type: String, trim: true, default: '' },
                },
            ],
            portfolioLink: { type: String, trim: true, default: '' },
            city: { type: String, trim: true, default: '' },
            tagline: { type: String, trim: true, default: '' },
            resumeAnonymizedText: { type: String, default: '' },
        },
        privateProfile: {
            fullName: { type: String, trim: true, default: '' },
            email: { type: String, trim: true, lowercase: true, default: '' },
            phone: { type: String, trim: true, default: '' },
            gender: { type: String, trim: true, default: '' },
            college: { type: String, trim: true, default: '' },
            address: { type: String, trim: true, default: '' },
            bio: { type: String, trim: true, default: '' },
            githubLink: { type: String, trim: true, default: '' },
            linkedinLink: { type: String, trim: true, default: '' },
        },
    },
    {
        timestamps: true,
    }
);

applicationSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });
applicationSchema.index({ recruiterId: 1, status: 1, createdAt: -1 });
applicationSchema.index({ candidateId: 1, createdAt: -1 });

const Application = mongoose.model('Application', applicationSchema);
module.exports = Application;
