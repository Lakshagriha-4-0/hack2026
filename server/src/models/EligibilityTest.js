const mongoose = require('mongoose');

const questionSchema = mongoose.Schema(
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

const answerSchema = mongoose.Schema(
    {
        questionId: { type: String, required: true, trim: true },
        answer: { type: String, required: true, trim: true },
    },
    { _id: false }
);

const eligibilityTestSchema = mongoose.Schema(
    {
        candidateId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
            index: true,
        },
        jobId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Job',
            index: true,
        },
        requiredSkillsSnapshot: { type: [String], default: [] },
        questions: { type: [questionSchema], default: [] },
        passScore: { type: Number, default: 60, min: 0, max: 100 },
        score: { type: Number, default: 0, min: 0, max: 100 },
        status: {
            type: String,
            enum: ['pending', 'passed', 'failed'],
            default: 'pending',
            index: true,
        },
        answers: { type: [answerSchema], default: [] },
        generatedBy: {
            type: String,
            enum: ['ai', 'fallback'],
            default: 'fallback',
        },
        submittedAt: Date,
        companyRound: {
            questions: { type: [questionSchema], default: [] },
            passScore: { type: Number, default: 60, min: 0, max: 100 },
            score: { type: Number, default: 0, min: 0, max: 100 },
            status: {
                type: String,
                enum: ['pending', 'passed', 'failed'],
                default: 'pending',
            },
            answers: { type: [answerSchema], default: [] },
            submittedAt: Date,
        },
    },
    { timestamps: true }
);

eligibilityTestSchema.index({ candidateId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model('EligibilityTest', eligibilityTestSchema);
