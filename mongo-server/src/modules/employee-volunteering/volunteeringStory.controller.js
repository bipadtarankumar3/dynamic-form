const mongoose = require('mongoose');
const VolunteeringStory = require('../../models/VolunteeringStory.model');
const VolunteeringStoryLike = require('../../models/VolunteeringStoryLike.model');
const VolunteeringStoryComment = require('../../models/VolunteeringStoryComment.model');
const { getFormCollection } = require('../../utils/formCollection.util');

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

const checkUserEventAttendance = async (eventId, userInfo) => {
  if (!eventId) return false;
  try {
    const { Model } = await getFormCollection('volunteering_event_volunteer');
    const matchCriteria = {
      $or: [
        { event_id: eventId },
        { 'data.event_id': eventId },
        { parent_id: eventId }
      ],
      $and: [
        {
          $or: [
            { emp_id: userInfo.empId },
            { 'data.emp_id': userInfo.empId },
            { user_id: userInfo.userId },
            { 'data.user_id': userInfo.userId },
            { email: { $regex: new RegExp(`^${userInfo.email}$`, 'i') } },
            { 'data.email': { $regex: new RegExp(`^${userInfo.email}$`, 'i') } }
          ]
        },
        {
          $or: [
            { status: { $regex: /attended/i } },
            { 'data.status': { $regex: /attended/i } },
            { feedback_form: { $exists: true, $ne: null } },
            { 'data.feedback_form': { $exists: true, $ne: null } }
          ]
        }
      ]
    };
    const found = await Model.findOne(matchCriteria).lean();
    return !!found;
  } catch (err) {
    console.error('[checkUserEventAttendance] Error:', err.message);
    return false;
  }
};

exports.getStories = async (req, res) => {
  try {
    const userInfo = extractUser(req);
    const { event_id, status, search, tag } = req.query;

    const filter = {};
    if (status) {
      filter.status = new RegExp(`^${status}$`, 'i');
    } else if (!req.query.all) {
      filter.status = { $in: ['published', 'submit', 'approved', 'active', 'Published', 'Submit'] };
    }

    if (event_id) {
      filter.$or = [{ event_id }, { parent_id: event_id }];
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { story_title: searchRegex },
        { excerpt: searchRegex },
        { author_name: searchRegex }
      ];
    }

    if (tag) {
      filter.tags = new RegExp(tag, 'i');
    }

    const stories = await VolunteeringStory.find(filter).sort({ published_at: -1, createdAt: -1 }).lean();

    // Enrich with likes count, user liked, comments count
    const enriched = await Promise.all(stories.map(async (story) => {
      const storyId = story._id.toString();
      const likesCount = await VolunteeringStoryLike.countDocuments({ story_id: storyId });
      let userLiked = false;
      if (userInfo.userId || userInfo.email) {
        userLiked = !!(await VolunteeringStoryLike.findOne({
          story_id: storyId,
          $or: [
            ...(userInfo.userId ? [{ user_id: userInfo.userId }] : []),
            ...(userInfo.email ? [{ email: userInfo.email }] : [])
          ]
        }));
      }
      const commentsCount = await VolunteeringStoryComment.countDocuments({ story_id: storyId });

      return {
        ...story,
        id: story._id,
        likes_count: likesCount || story.likes_count || 0,
        comments_count: commentsCount || story.comments_count || 0,
        user_liked: userLiked
      };
    }));

    res.json({
      success: true,
      data: enriched,
      count: enriched.length
    });
  } catch (error) {
    console.error('getStories Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const userInfo = extractUser(req);

    let story = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      story = await VolunteeringStory.findById(id).lean();
    }
    if (!story) {
      story = await VolunteeringStory.findOne({ $or: [{ id }, { event_id: id }] }).lean();
    }
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    const storyId = story._id.toString();

    // Increment views
    await VolunteeringStory.findByIdAndUpdate(story._id, { $inc: { views_count: 1 } });

    const likesCount = await VolunteeringStoryLike.countDocuments({ story_id: storyId });
    let userLiked = false;
    if (userInfo.userId || userInfo.email) {
      userLiked = !!(await VolunteeringStoryLike.findOne({
        story_id: storyId,
        $or: [
          ...(userInfo.userId ? [{ user_id: userInfo.userId }] : []),
          ...(userInfo.email ? [{ email: userInfo.email }] : [])
        ]
      }));
    }

    const comments = await VolunteeringStoryComment.find({ story_id: storyId })
      .sort({ createdAt: -1 })
      .lean();

    const isVerifiedAttendee = await checkUserEventAttendance(story.event_id, userInfo);

    res.json({
      success: true,
      data: {
        ...story,
        id: story._id,
        likes_count: likesCount,
        user_liked: userLiked,
        comments: comments.map(c => ({ ...c, id: c._id })),
        comments_count: comments.length,
        user_is_attendee: isVerifiedAttendee
      }
    });
  } catch (error) {
    console.error('getStoryById Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createOrUpdateStory = async (req, res) => {
  try {
    const { id } = req.params;
    const userInfo = extractUser(req);
    const body = req.body || {};

    const storyData = {
      event_id: body.event_id || body.parent_id || null,
      program_id: body.program_id || null,
      story_title: body.story_title || body.title || 'Untitled Impact Story',
      excerpt: body.excerpt || '',
      content: body.content || '',
      hero_image_url: body.hero_image_url || '',
      gallery_urls: Array.isArray(body.gallery_urls) ? body.gallery_urls : (body.gallery_urls ? [body.gallery_urls] : []),
      quote_text: body.quote_text || '',
      quote_author: body.quote_author || '',
      quote_author_role: body.quote_author_role || '',
      author_name: body.author_name || userInfo.userName,
      author_email: body.author_email || userInfo.email,
      author_emp_id: body.author_emp_id || userInfo.empId,
      author_avatar: body.author_avatar || userInfo.avatar,
      author_dept: body.author_dept || userInfo.department,
      status: body.status || 'published',
      tags: Array.isArray(body.tags) ? body.tags : (body.tags ? body.tags.split(',').map(t => t.trim()) : []),
      metrics: typeof body.metrics === 'object' ? body.metrics : {},
      published_at: body.status === 'published' ? (body.published_at || new Date()) : null
    };

    let story;
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      story = await VolunteeringStory.findByIdAndUpdate(id, { $set: storyData }, { new: true });
    } else if (body.event_id) {
      story = await VolunteeringStory.findOneAndUpdate(
        { event_id: body.event_id },
        { $set: storyData },
        { new: true, upsert: true }
      );
    } else {
      story = await VolunteeringStory.create(storyData);
    }

    res.json({
      success: true,
      message: 'Story saved successfully',
      data: story
    });
  } catch (error) {
    console.error('createOrUpdateStory Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteStory = async (req, res) => {
  try {
    const { id } = req.params;
    if (mongoose.Types.ObjectId.isValid(id)) {
      await VolunteeringStory.findByIdAndDelete(id);
      await VolunteeringStoryLike.deleteMany({ story_id: id });
      await VolunteeringStoryComment.deleteMany({ story_id: id });
    }
    res.json({ success: true, message: 'Story deleted successfully' });
  } catch (error) {
    console.error('deleteStory Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.toggleLike = async (req, res) => {
  try {
    const { id: story_id } = req.params;
    const userInfo = extractUser(req);

    const existingLike = await VolunteeringStoryLike.findOne({
      story_id,
      $or: [
        ...(userInfo.userId ? [{ user_id: userInfo.userId }] : []),
        ...(userInfo.email ? [{ email: userInfo.email }] : [])
      ]
    });

    let liked = false;
    if (existingLike) {
      await VolunteeringStoryLike.findByIdAndDelete(existingLike._id);
      liked = false;
    } else {
      await VolunteeringStoryLike.create({
        story_id,
        user_id: userInfo.userId,
        emp_id: userInfo.empId,
        user_name: userInfo.userName,
        email: userInfo.email
      });
      liked = true;
    }

    const totalLikes = await VolunteeringStoryLike.countDocuments({ story_id });
    await VolunteeringStory.findByIdAndUpdate(story_id, { likes_count: totalLikes });

    res.json({
      success: true,
      liked,
      likes_count: totalLikes
    });
  } catch (error) {
    console.error('toggleLike Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { id: story_id } = req.params;
    const userInfo = extractUser(req);
    const { comment_text } = req.body;

    if (!comment_text || !comment_text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const story = await VolunteeringStory.findById(story_id);
    const isVerified = story ? await checkUserEventAttendance(story.event_id, userInfo) : false;

    const comment = await VolunteeringStoryComment.create({
      story_id,
      user_id: userInfo.userId,
      emp_id: userInfo.empId,
      user_name: userInfo.userName,
      user_avatar: userInfo.avatar,
      user_dept: userInfo.department,
      comment_text: comment_text.trim(),
      is_verified_attendee: isVerified
    });

    const totalComments = await VolunteeringStoryComment.countDocuments({ story_id });
    if (story) {
      story.comments_count = totalComments;
      await story.save();
    }

    res.status(201).json({
      success: true,
      data: { ...comment.toObject(), id: comment._id }
    });
  } catch (error) {
    console.error('addComment Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { comment_id } = req.params;
    const userInfo = extractUser(req);

    const comment = await VolunteeringStoryComment.findById(comment_id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const isOwner = comment.user_id === userInfo.userId || comment.emp_id === userInfo.empId;
    if (!isOwner && req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }

    await VolunteeringStoryComment.findByIdAndDelete(comment_id);
    await VolunteeringStory.findByIdAndUpdate(comment.story_id, { $inc: { comments_count: -1 } });

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    console.error('deleteComment Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
