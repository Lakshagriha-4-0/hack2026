const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      enum: ["candidate", "recruiter"],
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    candidatePublicId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },
    candidateProfile: {
      personal: {
        fullName: { type: String, trim: true, default: "" },
        email: { type: String, trim: true, lowercase: true, default: "" },
        phone: { type: String, trim: true, default: "" },
        gender: { type: String, trim: true, default: "" },
        college: { type: String, trim: true, default: "" },
        address: { type: String, trim: true, default: "" },
        bio: { type: String, trim: true, default: "" },
        profilePic: { type: String, trim: true, default: "" },
        resumeOriginal: {
          fileName: { type: String, trim: true, default: "" },
          storagePath: { type: String, trim: true, default: "" },
          mimeType: { type: String, trim: true, default: "" },
          size: { type: Number, min: 0, default: 0 },
          uploadedAt: Date,
          text: { type: String, default: "" },
        },
        githubLink: { type: String, trim: true, default: "" },
        linkedinLink: { type: String, trim: true, default: "" },
        currentRole: { type: String, trim: true, default: "" },
        currentCompany: { type: String, trim: true, default: "" },
      },
      public: {
        skills: {
          type: [String],
          default: [],
          set: (skills) =>
            Array.isArray(skills)
              ? skills.map((skill) => String(skill).trim()).filter(Boolean)
              : [],
        },
        experienceYears: { type: Number, min: 0, max: 60, default: 0 },
        tagline: { type: String, trim: true, default: "" },
        projects: [
          {
            title: { type: String, trim: true, default: "" },
            description: { type: String, trim: true, default: "" },
            link: { type: String, trim: true, default: "" },
            technologies: {
              type: [String],
              default: [],
              set: (skills) =>
                Array.isArray(skills)
                  ? skills.map((skill) => String(skill).trim()).filter(Boolean)
                  : [],
            },
          },
        ],
        education: [
          {
            school: { type: String, trim: true, default: "" },
            degree: { type: String, trim: true, default: "" },
            fieldOfStudy: { type: String, trim: true, default: "" },
            startYear: { type: Number, min: 1900, max: 3000 },
            endYear: { type: Number, min: 1900, max: 3000 },
          },
        ],
        experience: [
          {
            company: { type: String, trim: true, default: "" },
            role: { type: String, trim: true, default: "" },
            location: { type: String, trim: true, default: "" },
            description: { type: String, trim: true, default: "" },
            startDate: { type: String, trim: true, default: "" },
            endDate: { type: String, trim: true, default: "" },
            isCurrent: { type: Boolean, default: false },
          },
        ],
        portfolioLink: { type: String, trim: true, default: "" },
        city: { type: String, trim: true, default: "" },
        resumeAnonymized: {
          text: { type: String, default: "" },
          updatedAt: Date,
        },
      },
    },
    recruiterProfile: {
      companyName: { type: String, trim: true, default: "" },
      designation: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
      website: { type: String, trim: true, default: "" },
      linkedin: { type: String, trim: true, default: "" },
      location: { type: String, trim: true, default: "" },
      about: { type: String, trim: true, default: "" },
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ email: 1 }, { unique: true });

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
