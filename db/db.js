const mongoose = require('mongoose');

let isConnected = false;

/**
 * Connects to MongoDB using process.env.MONGODB_URI.
 * Safe to call multiple times — only connects once.
 */
async function connectDB() {
    if (isConnected) return mongoose.connection;
    console.time('DB Connected');
    const uri = process.env.DB_URL
    if (!uri) {
        throw new Error('DB_URL is not defined in environment variables.');
    }

    mongoose.set('strictQuery', true);

    await mongoose.connect(uri, {
    dbName: 'api',
    serverSelectionTimeoutMS: 10000,
});

    isConnected = true;
    console.timeEnd('DB Connected');

    mongoose.connection.on('disconnected', () => {
        isConnected = false;
        console.warn('MongoDB disconnected.');
    });
    if(process.env.NODE_ENV === "development"){
        mongoose.set("debug", true);
    }
    return mongoose.connection;
}
async function disconnectDB() {
    await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB, mongoose };