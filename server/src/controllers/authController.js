const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const logger = require('../utils/logger');
const generateCandidateId = require('../utils/generateCandidateId');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const ensureCandidatePublicId = async (user) => {
    if (!user || user.role !== 'candidate') return user?.candidatePublicId;
    if (user.candidatePublicId) return user.candidatePublicId;

    user.candidatePublicId = generateCandidateId(user._id?.toString() || '');
    await user.save();
    return user.candidatePublicId;
};

const registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    logger.inf('reg.attempt', { email: normalizedEmail, role });

    try {
        const userExists = await User.findOne({ email: normalizedEmail });

        if (userExists) {
            logger.wrn('reg.exists', { email: normalizedEmail });
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            name,
            email: normalizedEmail,
            password,
            role,
            candidatePublicId:
                role === 'candidate'
                    ? generateCandidateId(new mongoose.Types.ObjectId().toString())
                    : undefined,
        });

        if (user) {
            logger.inf('reg.ok', { email: user.email, id: user._id });
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                candidatePublicId: user.candidatePublicId,
                token: generateToken(user._id),
            });
        } else {
            logger.wrn('reg.invalid', { email: normalizedEmail });
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        logger.err('reg.fail', error, { email: normalizedEmail });
        res.status(500).json({ message: 'Server error during registration' });
    }
};


const authUser = async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    logger.inf('login.attempt', { email: normalizedEmail });

    try {
        const user = await User.findOne({ email: normalizedEmail });

        if (user) {
            const isMatch = await user.matchPassword(password);
            logger.inf('login.check', { email: user.email, ok: isMatch });

            if (isMatch) {
                await ensureCandidatePublicId(user);
                return res.json({
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    candidatePublicId: user.candidatePublicId,
                    token: generateToken(user._id),
                });
            }
        } else {
            logger.wrn('login.miss', { email: normalizedEmail });
        }

        res.status(401).json({ message: 'Invalid email or password' });
    } catch (error) {
        logger.err('login.fail', error, { email: normalizedEmail });
        res.status(500).json({ message: 'Server error during login' });
    }
};


const getMe = async (req, res) => {
    const user = await User.findById(req.user._id)
        .select('name email role candidatePublicId candidateProfile');

    if (user) {
        await ensureCandidatePublicId(user);
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            candidatePublicId: user.candidatePublicId,
            candidateProfile: user.candidateProfile,
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
};

module.exports = { registerUser, authUser, getMe };
