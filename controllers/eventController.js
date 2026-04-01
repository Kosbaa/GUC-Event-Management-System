const { validationResult } = require('express-validator');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

// GET /events
const getEvents = async (req, res) => {
  try {
    const { category, search, page = 1 } = req.query;
    const limit = 9;
    const skip = (Number(page) - 1) * limit;

    const filter = { isPublished: true, isCancelled: false, date: { $gte: new Date() } };
    if (category && category !== 'all') filter.category = category;
    if (search) filter.$text = { $search: search };

    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate('organizer', 'name')
        .sort({ date: 1 })
        .skip(skip)
        .limit(limit),
      Event.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.render('events/index', {
      title: 'Events',
      events,
      category: category || 'all',
      search: search || '',
      currentPage: Number(page),
      totalPages
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not load events');
    res.redirect('/');
  }
};

// GET /events/new
const getNewEvent = (req, res) => {
  res.render('events/new', { title: 'Create Event' });
};

// POST /events
const createEvent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array()[0].msg);
    return res.redirect('/events/new');
  }

  try {
    const {
      title, description, category, date, endDate,
      location, capacity, tags, registrationDeadline
    } = req.body;

    const event = await Event.create({
      title,
      description,
      category,
      date: new Date(date),
      endDate: endDate ? new Date(endDate) : undefined,
      location,
      capacity: Number(capacity),
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : undefined,
      organizer: req.session.userId,
      isPublished: req.body.isPublished === 'on',
      image: req.file ? `/uploads/${req.file.filename}` : undefined
    });

    req.flash('success', 'Event created successfully!');
    res.redirect(`/events/${event._id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not create event');
    res.redirect('/events/new');
  }
};

// GET /events/:id
const getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('organizer', 'name email');
    if (!event) {
      req.flash('error', 'Event not found');
      return res.redirect('/events');
    }

    let isRegistered = false;
    if (req.session.userId) {
      const reg = await Registration.findOne({ user: req.session.userId, event: event._id });
      isRegistered = !!reg;
    }

    res.render('events/show', { title: event.title, event, isRegistered });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not load event');
    res.redirect('/events');
  }
};

// GET /events/:id/edit
const getEditEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      req.flash('error', 'Event not found');
      return res.redirect('/events');
    }

    const isOwner = event.organizer.toString() === req.session.userId.toString();
    const isAdmin = req.session.userRole === 'admin';
    if (!isOwner && !isAdmin) {
      req.flash('error', 'Not authorized');
      return res.redirect('/events');
    }

    res.render('events/edit', { title: 'Edit Event', event });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not load event');
    res.redirect('/events');
  }
};

// PUT /events/:id
const updateEvent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array()[0].msg);
    return res.redirect(`/events/${req.params.id}/edit`);
  }

  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      req.flash('error', 'Event not found');
      return res.redirect('/events');
    }

    const isOwner = event.organizer.toString() === req.session.userId.toString();
    const isAdmin = req.session.userRole === 'admin';
    if (!isOwner && !isAdmin) {
      req.flash('error', 'Not authorized');
      return res.redirect('/events');
    }

    const {
      title, description, category, date, endDate,
      location, capacity, tags, registrationDeadline
    } = req.body;

    event.title = title;
    event.description = description;
    event.category = category;
    event.date = new Date(date);
    event.endDate = endDate ? new Date(endDate) : undefined;
    event.location = location;
    event.capacity = Number(capacity);
    event.tags = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    event.registrationDeadline = registrationDeadline ? new Date(registrationDeadline) : undefined;
    event.isPublished = req.body.isPublished === 'on';
    if (req.file) event.image = `/uploads/${req.file.filename}`;

    await event.save();

    req.flash('success', 'Event updated successfully!');
    res.redirect(`/events/${event._id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not update event');
    res.redirect(`/events/${req.params.id}/edit`);
  }
};

// DELETE /events/:id
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      req.flash('error', 'Event not found');
      return res.redirect('/events');
    }

    const isOwner = event.organizer.toString() === req.session.userId.toString();
    const isAdmin = req.session.userRole === 'admin';
    if (!isOwner && !isAdmin) {
      req.flash('error', 'Not authorized');
      return res.redirect('/events');
    }

    await Registration.deleteMany({ event: event._id });
    await event.deleteOne();

    req.flash('success', 'Event deleted');
    res.redirect('/events');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not delete event');
    res.redirect('/events');
  }
};

module.exports = {
  getEvents, getNewEvent, createEvent,
  getEvent, getEditEvent, updateEvent, deleteEvent
};
