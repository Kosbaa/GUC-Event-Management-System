const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/guc_events';
  await mongoose.connect(uri);
  console.log('MongoDB connected');
};

module.exports = connectDB;
