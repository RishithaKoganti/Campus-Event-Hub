const Event = require('../models/Event');
const User = require('../models/User');

// Create a new event
exports.createEvent = async (req, res) => {
  try {
    const { title, description, date, time, location, category, capacity, tags } = req.body;

    const event = await Event.create({
      title,
      description,
      date,
      time,
      location,
      category,
      capacity,
      tags,
      organizer: {
        id: req.user.id,
        name: req.user.name
      }
    });

    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get all events
exports.getAllEvents = async (req, res) => {
  try {
    const { category, search, sortBy } = req.query;
    let query = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    let events = Event.find(query);

    if (sortBy === 'upcoming') {
      events = events.sort({ date: 1 });
    } else if (sortBy === 'popular') {
      events = events.sort({ registeredUsers: -1 });
    } else {
      events = events.sort({ createdAt: -1 });
    }

    const result = await events.populate('organizer.id', 'name email profileImage');

    res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get single event by ID
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('organizer.id', 'name email profileImage').populate('attendees.userId', 'name email profileImage');

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Update event
exports.updateEvent = async (req, res) => {
  try {
    let event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Check if user is the organizer
    if (event.organizer.id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this event'
      });
    }

    event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Delete event
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Check if user is the organizer
    if (event.organizer.id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this event'
      });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Register for event
exports.registerEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Check if user is already registered
    const isRegistered = event.attendees.some(attendee => attendee.userId.toString() === req.user.id);

    if (isRegistered) {
      return res.status(400).json({
        success: false,
        error: 'User already registered for this event'
      });
    }

    // Check capacity
    if (event.registeredUsers >= event.capacity) {
      return res.status(400).json({
        success: false,
        error: 'Event capacity is full'
      });
    }

    event.attendees.push({
      userId: req.user.id
    });
    event.registeredUsers += 1;

    await event.save();

    // Add event to user's registered events
    await User.findByIdAndUpdate(req.user.id, {
      $push: {
        registeredEvents: {
          eventId: event._id
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Successfully registered for event',
      data: event
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Unregister from event
exports.unregisterEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    const attendeeIndex = event.attendees.findIndex(attendee => attendee.userId.toString() === req.user.id);

    if (attendeeIndex === -1) {
      return res.status(400).json({
        success: false,
        error: 'User not registered for this event'
      });
    }

    event.attendees.splice(attendeeIndex, 1);
    event.registeredUsers -= 1;

    await event.save();

    // Remove event from user's registered events
    await User.findByIdAndUpdate(req.user.id, {
      $pull: {
        registeredEvents: {
          eventId: event._id
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Successfully unregistered from event',
      data: event
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
