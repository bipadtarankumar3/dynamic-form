const mongoose = require('mongoose');
const { getFormCollection } = require('../../utils/formCollection.util');
const VolunteeringStory = require('../../models/VolunteeringStory.model');

// Helper to extract clean user info from req
const extractUser = (req) => {
  const u = req.user || {};
  return {
    userId: u.userId || u.id || u._id || null,
    empId: u.emp_id || u.employee_id || u.empId || null,
    userName: u.name || u.full_name || u.email?.split('@')[0] || 'Volunteer',
    email: u.email || '',
    avatar: u.avatar || u.profile_picture || null,
    department: u.department || u.dept || 'Corporate Volunteering',
  };
};

// ------------------------------------------------------------
// 1. PROGRAMS CONTROLLER
// ------------------------------------------------------------
exports.getPrograms = async (req, res) => {
  try {
    const { Model } = await getFormCollection('volunteering_program');
    const { status, search } = req.query;

    const filter = {};
    if (status) {
      filter.$or = [{ status }, { 'data.status': status }];
    }
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { program_name: searchRegex },
        { 'data.program_name': searchRegex },
        { title: searchRegex },
        { 'data.title': searchRegex }
      ];
    }

    const programs = await Model.find(filter).sort({ createdAt: -1 }).lean();

    // Map normalized response
    const data = programs.map(p => {
      const flat = { ...p, ...(p.data || {}) };
      return {
        ...flat,
        id: p._id.toString(),
        _id: p._id.toString()
      };
    });

    res.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error('getPrograms Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProgramById = async (req, res) => {
  try {
    const { id } = req.params;
    const { Model } = await getFormCollection('volunteering_program');

    let program = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      program = await Model.findById(id).lean();
    }
    if (!program) {
      program = await Model.findOne({ $or: [{ id }, { 'data.id': id }] }).lean();
    }

    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }

    const flat = { ...program, ...(program.data || {}) };
    res.json({ success: true, data: { ...flat, id: program._id.toString() } });
  } catch (error) {
    console.error('getProgramById Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createProgram = async (req, res) => {
  try {
    const { Model } = await getFormCollection('volunteering_program');
    const user = extractUser(req);
    const body = req.body || {};

    const programData = {
      ...body,
      status: body.status || 'Active',
      created_by: user.userId,
      created_by_name: user.userName
    };

    const doc = await Model.create({
      data: programData,
      status: programData.status,
      created_by: user.userId
    });

    res.status(201).json({
      success: true,
      message: 'Program created successfully',
      data: { ...programData, id: doc._id.toString(), _id: doc._id.toString() }
    });
  } catch (error) {
    console.error('createProgram Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const { Model } = await getFormCollection('volunteering_program');
    const body = req.body || {};

    const updated = await Model.findByIdAndUpdate(
      id,
      { $set: { data: body, ...body } },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }

    res.json({
      success: true,
      message: 'Program updated successfully',
      data: { ...updated, ...(updated.data || {}), id: updated._id.toString() }
    });
  } catch (error) {
    console.error('updateProgram Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const { Model } = await getFormCollection('volunteering_program');
    await Model.findByIdAndDelete(id);
    res.json({ success: true, message: 'Program deleted successfully' });
  } catch (error) {
    console.error('deleteProgram Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ------------------------------------------------------------
// 2. EVENTS CONTROLLER
// ------------------------------------------------------------
exports.getEvents = async (req, res) => {
  try {
    const { Model: EventModel } = await getFormCollection('volunteering_event');
    const { Model: VolModel } = await getFormCollection('volunteering_event_volunteer');
    const { program_id, status, search } = req.query;

    const filter = {};
    if (program_id) {
      filter.$or = [{ program_id }, { 'data.program_id': program_id }, { parent_id: program_id }];
    }
    if (status) {
      filter.$or = [{ status }, { 'data.status': status }];
    }
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { event_title: searchRegex },
        { 'data.event_title': searchRegex },
        { title: searchRegex },
        { 'data.title': searchRegex }
      ];
    }

    const events = await EventModel.find(filter).sort({ createdAt: -1 }).lean();

    // Enrich with registered & attended count
    const enriched = await Promise.all(events.map(async (ev) => {
      const evId = ev._id.toString();
      const flat = { ...ev, ...(ev.data || {}) };

      const totalVolunteers = await VolModel.countDocuments({
        $or: [{ event_id: evId }, { 'data.event_id': evId }, { parent_id: evId }]
      });

      const attendedVolunteers = await VolModel.countDocuments({
        $or: [{ event_id: evId }, { 'data.event_id': evId }, { parent_id: evId }],
        $or: [{ status: 'attended' }, { 'data.status': 'attended' }, { status: 'Attended' }]
      });

      return {
        ...flat,
        id: evId,
        _id: evId,
        registered_count: totalVolunteers,
        attended_count: attendedVolunteers
      };
    }));

    res.json({ success: true, data: enriched, count: enriched.length });
  } catch (error) {
    console.error('getEvents Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const { Model: EventModel } = await getFormCollection('volunteering_event');
    const { Model: VolModel } = await getFormCollection('volunteering_event_volunteer');

    let event = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      event = await EventModel.findById(id).lean();
    }
    if (!event) {
      event = await EventModel.findOne({ $or: [{ id }, { 'data.id': id }] }).lean();
    }
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const evId = event._id.toString();
    const flat = { ...event, ...(event.data || {}) };

    const volunteers = await VolModel.find({
      $or: [{ event_id: evId }, { 'data.event_id': evId }, { parent_id: evId }]
    }).lean();

    const story = await VolunteeringStory.findOne({
      $or: [{ event_id: evId }, { parent_id: evId }]
    }).lean();

    res.json({
      success: true,
      data: {
        ...flat,
        id: evId,
        _id: evId,
        volunteers: volunteers.map(v => ({ ...v, ...(v.data || {}), id: v._id.toString() })),
        story: story ? { ...story, id: story._id.toString() } : null
      }
    });
  } catch (error) {
    console.error('getEventById Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const { Model } = await getFormCollection('volunteering_event');
    const user = extractUser(req);
    const body = req.body || {};

    const eventData = {
      ...body,
      status: body.status || 'Draft',
      created_by: user.userId,
      created_by_name: user.userName
    };

    const doc = await Model.create({
      data: eventData,
      status: eventData.status,
      created_by: user.userId
    });

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: { ...eventData, id: doc._id.toString(), _id: doc._id.toString() }
    });
  } catch (error) {
    console.error('createEvent Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { Model } = await getFormCollection('volunteering_event');
    const body = req.body || {};

    const updated = await Model.findByIdAndUpdate(
      id,
      { $set: { data: body, ...body } },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: { ...updated, ...(updated.data || {}), id: updated._id.toString() }
    });
  } catch (error) {
    console.error('updateEvent Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { Model: EventModel } = await getFormCollection('volunteering_event');
    const { Model: VolModel } = await getFormCollection('volunteering_event_volunteer');

    await EventModel.findByIdAndDelete(id);
    await VolModel.deleteMany({ $or: [{ event_id: id }, { 'data.event_id': id }, { parent_id: id }] });

    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('deleteEvent Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Lifecycle transitions
exports.submitEventForApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { Model } = await getFormCollection('volunteering_event');
    const updated = await Model.findByIdAndUpdate(
      id,
      { $set: { status: 'Pending Approval', 'data.status': 'Pending Approval' } },
      { new: true }
    );
    res.json({ success: true, message: 'Event submitted for approval', data: updated });
  } catch (error) {
    console.error('submitEventForApproval Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.publishEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { Model } = await getFormCollection('volunteering_event');
    const updated = await Model.findByIdAndUpdate(
      id,
      { $set: { status: 'Published', 'data.status': 'Published' } },
      { new: true }
    );
    res.json({ success: true, message: 'Event published to portal', data: updated });
  } catch (error) {
    console.error('publishEvent Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.saveEventClosure = async (req, res) => {
  try {
    const { id } = req.params;
    const { Model } = await getFormCollection('volunteering_event');
    const body = req.body || {};

    const updated = await Model.findByIdAndUpdate(
      id,
      {
        $set: {
          status: 'Closed',
          'data.status': 'Closed',
          'data.closure_notes': body.closure_notes,
          'data.actual_beneficiaries': body.actual_beneficiaries,
          'data.actual_cost': body.actual_cost,
          'data.actual_volunteers': body.actual_volunteers
        }
      },
      { new: true }
    );

    res.json({ success: true, message: 'Event closure recorded', data: updated });
  } catch (error) {
    console.error('saveEventClosure Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.saveEventStory = async (req, res) => {
  try {
    const { id } = req.params;
    const user = extractUser(req);
    const body = req.body || {};

    const story = await VolunteeringStory.findOneAndUpdate(
      { event_id: id },
      {
        $set: {
          event_id: id,
          story_title: body.story_title || body.title || 'Event Impact Story',
          excerpt: body.excerpt || '',
          content: body.content || '',
          hero_image_url: body.hero_image_url || '',
          gallery_urls: Array.isArray(body.gallery_urls) ? body.gallery_urls : (body.gallery_urls ? [body.gallery_urls] : []),
          quote_text: body.quote_text || '',
          quote_author: body.quote_author || '',
          quote_author_role: body.quote_author_role || '',
          author_name: body.author_name || user.userName,
          status: body.status || 'published',
          tags: Array.isArray(body.tags) ? body.tags : (body.tags ? body.tags.split(',') : [])
        }
      },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: 'Event story saved', data: story });
  } catch (error) {
    console.error('saveEventStory Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ------------------------------------------------------------
// 3. ATTENDANCE & VOLUNTEERS CONTROLLER
// ------------------------------------------------------------
exports.getEventVolunteers = async (req, res) => {
  try {
    const { id } = req.params;
    const { Model } = await getFormCollection('volunteering_event_volunteer');

    const volunteers = await Model.find({
      $or: [{ event_id: id }, { 'data.event_id': id }, { parent_id: id }]
    }).sort({ createdAt: -1 }).lean();

    const data = volunteers.map(v => {
      const flat = { ...v, ...(v.data || {}) };
      return { ...flat, id: v._id.toString() };
    });

    res.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error('getEventVolunteers Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateVolunteerAttendance = async (req, res) => {
  try {
    const { id, volunteerId } = req.params;
    const { Model } = await getFormCollection('volunteering_event_volunteer');
    const { status, hours_contributed, remarks } = req.body;

    const updated = await Model.findByIdAndUpdate(
      volunteerId,
      {
        $set: {
          status: status || 'Attended',
          'data.status': status || 'Attended',
          'data.hours_contributed': hours_contributed || 0,
          'data.remarks': remarks || ''
        }
      },
      { new: true }
    );

    res.json({ success: true, message: 'Volunteer attendance updated', data: updated });
  } catch (error) {
    console.error('updateVolunteerAttendance Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addWalkInVolunteer = async (req, res) => {
  try {
    const { id: event_id } = req.params;
    const { Model } = await getFormCollection('volunteering_event_volunteer');
    const body = req.body || {};

    const volData = {
      event_id,
      emp_id: body.emp_id || '',
      volunteer_name: body.volunteer_name || body.name || 'Walk-in Volunteer',
      email: body.email || '',
      phone: body.phone || '',
      department: body.department || '',
      status: body.status || 'Attended',
      is_walk_in: true,
      hours_contributed: body.hours_contributed || 0
    };

    const doc = await Model.create({
      event_id,
      data: volData,
      status: volData.status
    });

    res.status(201).json({
      success: true,
      message: 'Walk-in volunteer registered',
      data: { ...volData, id: doc._id.toString() }
    });
  } catch (error) {
    console.error('addWalkInVolunteer Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ------------------------------------------------------------
// 4. EMPLOYEE SELF-SERVICE PORTAL CONTROLLER
// ------------------------------------------------------------
exports.getPortalEvents = async (req, res) => {
  try {
    const { Model: EventModel } = await getFormCollection('volunteering_event');
    const { Model: VolModel } = await getFormCollection('volunteering_event_volunteer');
    const user = extractUser(req);

    const filter = {
      $or: [
        { status: { $in: ['Published', 'published', 'Active', 'active', 'Completed', 'Closed'] } },
        { 'data.status': { $in: ['Published', 'published', 'Active', 'active', 'Completed', 'Closed'] } }
      ]
    };

    const events = await EventModel.find(filter).sort({ 'data.start_date': -1, createdAt: -1 }).lean();

    const portalEvents = await Promise.all(events.map(async (ev) => {
      const evId = ev._id.toString();
      const flat = { ...ev, ...(ev.data || {}) };

      // Check if current user RSVP'd
      const userRegistration = await VolModel.findOne({
        $or: [{ event_id: evId }, { 'data.event_id': evId }, { parent_id: evId }],
        $or: [
          ...(user.empId ? [{ emp_id: user.empId }, { 'data.emp_id': user.empId }] : []),
          ...(user.userId ? [{ user_id: user.userId }, { 'data.user_id': user.userId }] : []),
          ...(user.email ? [{ email: user.email }, { 'data.email': user.email }] : [])
        ]
      }).lean();

      return {
        ...flat,
        id: evId,
        _id: evId,
        is_registered: !!userRegistration,
        registration_status: userRegistration ? (userRegistration.status || userRegistration.data?.status || 'Registered') : null,
        registration_id: userRegistration ? userRegistration._id.toString() : null
      };
    }));

    res.json({ success: true, data: portalEvents, count: portalEvents.length });
  } catch (error) {
    console.error('getPortalEvents Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.submitPortalRsvp = async (req, res) => {
  try {
    const { Model: VolModel } = await getFormCollection('volunteering_event_volunteer');
    const { Model: EventModel } = await getFormCollection('volunteering_event');
    const user = extractUser(req);
    const { event_id, notes } = req.body;

    if (!event_id) {
      return res.status(400).json({ success: false, message: 'Event ID is required' });
    }

    // Check existing registration
    const existing = await VolModel.findOne({
      $or: [{ event_id }, { 'data.event_id': event_id }, { parent_id: event_id }],
      $or: [
        ...(user.empId ? [{ emp_id: user.empId }, { 'data.emp_id': user.empId }] : []),
        ...(user.userId ? [{ user_id: user.userId }, { 'data.user_id': user.userId }] : []),
        ...(user.email ? [{ email: user.email }, { 'data.email': user.email }] : [])
      ]
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already registered for this event' });
    }

    const volData = {
      event_id,
      user_id: user.userId,
      emp_id: user.empId,
      volunteer_name: user.userName,
      email: user.email,
      department: user.department,
      status: 'Registered',
      rsvp_notes: notes || '',
      registered_at: new Date()
    };

    const doc = await VolModel.create({
      event_id,
      user_id: user.userId,
      data: volData,
      status: 'Registered'
    });

    res.status(201).json({
      success: true,
      message: 'Successfully registered for volunteering event',
      data: { ...volData, id: doc._id.toString() }
    });
  } catch (error) {
    console.error('submitPortalRsvp Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.submitPortalFeedback = async (req, res) => {
  try {
    const { Model: VolModel } = await getFormCollection('volunteering_event_volunteer');
    const user = extractUser(req);
    const { event_id, rating, feedback_text, key_takeaways } = req.body;

    const registration = await VolModel.findOne({
      $or: [{ event_id }, { 'data.event_id': event_id }, { parent_id: event_id }],
      $or: [
        ...(user.empId ? [{ emp_id: user.empId }, { 'data.emp_id': user.empId }] : []),
        ...(user.userId ? [{ user_id: user.userId }, { 'data.user_id': user.userId }] : []),
        ...(user.email ? [{ email: user.email }, { 'data.email': user.email }] : [])
      ]
    });

    if (!registration) {
      return res.status(404).json({ success: false, message: 'No registration record found for this event' });
    }

    const feedback_form = {
      rating: Number(rating) || 5,
      feedback_text: feedback_text || '',
      key_takeaways: key_takeaways || '',
      submitted_at: new Date()
    };

    registration.status = 'Attended';
    if (!registration.data) registration.data = {};
    registration.data.status = 'Attended';
    registration.data.feedback_form = feedback_form;
    registration.markModified('data');
    await registration.save();

    res.json({
      success: true,
      message: 'Feedback submitted successfully. Thank you for making an impact!',
      data: feedback_form
    });
  } catch (error) {
    console.error('submitPortalFeedback Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
