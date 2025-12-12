const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    enrollmentDate: { type: Date, default: Date.now },
    progress: { type: Number, default: 0 }
});

module.exports = mongoose.model('Enrollment', enrollmentSchema);
