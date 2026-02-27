const mongoose = require('mongoose');

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
    },
    {
        timestamps: true,
    }
);

jobSchema.index({ recruiterId: 1, createdAt: -1 });

const Job = mongoose.model('Job', jobSchema);
module.exports = Job;
