const express = require('express');
const router = express.Router();
const Notification = require('../../models/Notification.model');
const { authenticateToken } = require('../../middlewares/auth.middleware');

router.use(authenticateToken);

// GET /api/v1/notifications
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    const notifications = await Notification.find({
      $or: [{ user_id: userId }, { user_id: null }]
    }).sort({ createdAt: -1 }).limit(50).lean();

    const unreadCount = await Notification.countDocuments({
      $or: [{ user_id: userId }, { user_id: null }],
      is_read: false
    });

    res.json({
      success: true,
      data: notifications.map(n => ({ ...n, id: n._id.toString() })),
      unread_count: unreadCount
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/notifications/:id/read
router.put('/:id/read', async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { is_read: true, read_at: new Date() });
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/notifications/mark-all-read
router.put('/mark-all-read', async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    await Notification.updateMany(
      { $or: [{ user_id: userId }, { user_id: null }], is_read: false },
      { is_read: true, read_at: new Date() }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
