const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      maxlength: [5000, 'Description cannot exceed 5000 characters']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['academic', 'social', 'sports', 'cultural', 'workshop', 'conference', 'other'],
      default: 'other'
    },
    date: {
      type: Date,
      required: [true, 'Event date is required']
    },
    endDate: {
      type: Date
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      maxlength: [300, 'Location cannot exceed 300 characters']
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1']
    },
    registeredCount: {
      type: Number,
      default: 0
    },
    image: {
      type: String,
      default: '/images/default-event.png'
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    tags: [{ type: String, trim: true }],
    isPublished: {
      type: Boolean,
      default: false
    },
    isCancelled: {
      type: Boolean,
      default: false
    },
    registrationDeadline: {
      type: Date
    }
  },
  { timestamps: true }
);

EventSchema.virtual('isFull').get(function () {
  return this.registeredCount >= this.capacity;
});

EventSchema.virtual('availableSpots').get(function () {
  return Math.max(0, this.capacity - this.registeredCount);
});

EventSchema.set('toJSON', { virtuals: true });
EventSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Event', EventSchema);
