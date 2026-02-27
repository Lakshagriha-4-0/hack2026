const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const app = require('./src/app');
const connectDB = require('./src/config/db');
const logger = require('./src/utils/logger');

connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    logger.inf('api.up', { mode: process.env.NODE_ENV || 'dev', port: PORT });
});
