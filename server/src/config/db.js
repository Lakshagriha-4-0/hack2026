const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    logger.inf('db.ok', { host: conn.connection.host });
  } catch (error) {
    logger.err('db.fail', error);
    process.exit(1);
  }
};

module.exports = connectDB;
