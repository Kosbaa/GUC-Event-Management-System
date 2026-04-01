const mongoose = require('mongoose');

const RegistrationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'attended'],
      default: 'confirmed'
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    }
  },
  { timestamps: true }
);

RegistrationSchema.index({ user: 1, event: 1 }, { unique: true });

module.exports = mongoose.model('Registration', RegistrationSchema);
