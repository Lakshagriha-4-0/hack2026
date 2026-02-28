const mongoose = require('mongoose');

const recruiterTestQuestionSchema = mongoose.Schema(
    {
        questionId: { type: String, required: true, trim: true },
        question: { type: String, required: true, trim: true },
        options: {
            type: [String],
            default: [],
            validate: [(arr) => Array.isArray(arr) && arr.length >= 2, 'At least 2 options are required'],
        },
        correctAnswer: { type: String, required: true, trim: true },
    },
    { _id: false }
);

const jobSchema = mongoose.Schema(
    {
        recruiterId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        description: {
            type: String,
            required: true,
            trim: true,
            minlength: 10,
            maxlength: 5000,
        },
        requiredSkills: {
            type: [String],
            required: true,
            default: [],
            set: (skills) =>
                Array.isArray(skills)
                    ? skills.map((skill) => String(skill).trim()).filter(Boolean)
                    : [],
        },
        experienceLevel: {
            type: String,
            trim: true,
            default: '',
            maxlength: 80,
        },
        location: {
            type: String,
            trim: true,
            default: '',
            maxlength: 120,
        },
        salaryRange: {
            type: String,
            trim: true,
            default: '',
            maxlength: 120,
        },
        deadlineAt: {
            type: Date,
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ['active', 'expired'],
            default: 'active',
            index: true,
        },
        recruiterTest: {
            questions: { type: [recruiterTestQuestionSchema], default: [] },
            passScore: { type: Number, default: 0, min: 0, max: 100 },
            generatedBy: {
                type: String,
                enum: ['manual', 'ai'],
                default: 'manual',
            },
        },
    },
    {
        timestamps: true,
    }
);

jobSchema.index({ recruiterId: 1, createdAt: -1 });

const Job = mongoose.model('Job', jobSchema);
module.exports = Job;
