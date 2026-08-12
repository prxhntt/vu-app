const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
    branch: {
        type: String,
        required: true,
        enum: ['cs', 'ai', 'cyber', 'me', 'ce', 'ee', 'ec']
    },
    branchName: {
        type: String,
        required: true
    },
    semester: {
        type: Number,
        required: true,
        min: 1,
        max: 8
    },
    imageUrl: {
        type: String,
        required: true
    },
    publicId: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

timetableSchema.index({ branch: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('Timetable', timetableSchema);