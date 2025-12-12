const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    fee: Number,
    image: { type: String, default: '/images/default-course.png' },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    schedule: { days: [String], time: String },
    liveClassLink: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', courseSchema);
