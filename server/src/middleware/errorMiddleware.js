const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    if (err?.type === 'entity.too.large' || err?.status === 413) {
        logger.wrn('payload.too.large', { path: req.originalUrl });
        return res.status(413).json({
            message: 'Payload too large. Reduce request size or split data and try again.',
        });
    }

    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    logger.err('global', err, { st: statusCode, path: req.originalUrl });
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

module.exports = { errorHandler, notFound };
