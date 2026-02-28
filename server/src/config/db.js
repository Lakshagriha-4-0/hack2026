const mongoose = require('mongoose');
const logger = require('../utils/logger');
const Job = require('../models/Job');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    logger.inf('db.ok', { host: conn.connection.host });

    // Migrate old TTL index: keep jobs after deadline and mark them expired instead of deleting.
    try {
      const indexes = await Job.collection.indexes();
      const ttl = indexes.find((idx) => idx.name === 'deadlineAt_1' && typeof idx.expireAfterSeconds === 'number');
      if (ttl) {
        await Job.collection.dropIndex('deadlineAt_1');
        await Job.collection.createIndex({ deadlineAt: 1 }, { name: 'deadlineAt_1' });
        logger.inf('db.job.deadline.index.migrated');
      }
    } catch (idxErr) {
      logger.wrn('db.job.deadline.index.skip', { e: idxErr.message });
    }
  } catch (error) {
    logger.err('db.fail', error);
    process.exit(1);
  }
};

module.exports = connectDB;
