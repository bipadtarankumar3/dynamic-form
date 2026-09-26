// server/src/modules/employee-volunteering/volunteeringStory.controller.js
// ============================================================
// Volunteering Impact Story & Community Feed Controller
// WordPress-style story publishing linked to Volunteering Events
// Supports:
// - Standalone Story table (t_volunteering_impact_story)
// - Story feed, detail reader with rich media & quotes
// - Live Likes (t_volunteering_story_likes)
// - Verified Volunteer Comments (t_volunteering_story_comments)
// - Event Attendance validation (t_frm_volunteering_event_volunteer)
// ============================================================

const db = require("../../config/db");
const { getFormWithSection } = require("../../helper/getFormWithSection.helper");
const storageService = require("../../services/storage.service");

const STORY_TABLE = "t_volunteering_impact_story";
const EVENT_TABLE = "t_frm_volunteering_event";
const VOLUNTEER_TABLE = "t_frm_volunteering_event_volunteer";
const LIKES_TABLE = "t_volunteering_story_likes";
const COMMENTS_TABLE = "t_volunteering_story_comments";

/**
 * Helper to extract user identity from JWT request
 */
const extractUser = (req) => {
  const u = req.user || {};
  return {
    userId: u.user_id || u.id || null,
    empId: u.emp_id || u.employee_id || u.empId || null,
    userName: u.name || u.user_name || u.full_name || u.email?.split("@")[0] || "Volunteer",
    email: u.email || "",
    avatar: u.avatar || u.profile_picture || null,
    department: u.department || u.dept || "Corporate Volunteering",
  };
};

/**
 * Check if a given user attended a specific event
 */
const checkUserEventAttendance = async (eventId, userInfo) => {
  if (!eventId) return false;
  try {
    const res = await db.query(
      `SELECT id, status, feedback_form 
       FROM ${VOLUNTEER_TABLE} 
       WHERE event_id = $1 
         AND (
           (emp_id IS NOT NULL AND emp_id = $2) 
           OR (user_id IS NOT NULL AND user_id = $3) 
           OR (email IS NOT NULL AND LOWER(email) = LOWER($4))
         )
         AND (
           LOWER(COALESCE(status, '')) = 'attended'
           OR feedback_form IS NOT NULL
         )
       LIMIT 1`,
      [eventId, userInfo.empId, userInfo.userId, userInfo.email]
    );
    return res.rows.length > 0;
  } catch (err) {
    console.error("[checkUserEventAttendance] Error:", err.message);
    return false;
  }
};

/**
 * Get all published impact stories (Feed view)
 */
exports.getStories = async (req, res) => {
  try {
    const userInfo = extractUser(req);
    const { event_id, status, search, tag } = req.query;

    let whereClauses = [];
    let params = [];

    // Filter by status if provided, else default to Published / Submit for volunteers
    if (status) {
      params.push(status.toLowerCase());
      whereClauses.push(`LOWER(COALESCE(s.status, '')) = $${params.length}`);
    } else if (!req.query.all) {
      whereClauses.push(`(
        LOWER(COALESCE(s.status, '')) IN ('published', 'submit', 'approved', 'active')
        OR (LOWER(COALESCE(s.status, '')) NOT IN ('draft', 'archived', 'trash') AND s.status IS NOT NULL)
      )`);
    }

    if (event_id) {
      params.push(event_id);
      whereClauses.push(`COALESCE(s.event_id, s.parent_id) = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(s.story_title ILIKE $${params.length} OR s.excerpt ILIKE $${params.length} OR s.author_name ILIKE $${params.length})`);
    }

    if (tag) {
      params.push(`%${tag}%`);
      whereClauses.push(`s.tags::text ILIKE $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const query = `
      SELECT 
        s.*,
        e.event_name,
        e.event_location,
        e.event_date,
        e.csr_theme AS event_category,
        e.event_type,
        COALESCE(l.like_count, 0)::int AS like_count,
        COALESCE(c.comment_count, 0)::int AS comment_count,
        CASE WHEN ul.id IS NOT NULL THEN true ELSE false END AS user_has_liked
      FROM ${STORY_TABLE} s
      LEFT JOIN ${EVENT_TABLE} e ON e.id = COALESCE(s.event_id, s.parent_id)
      LEFT JOIN (
        SELECT story_id, COUNT(*) AS like_count 
        FROM ${LIKES_TABLE} 
        GROUP BY story_id
      ) l ON l.story_id = s.id
      LEFT JOIN (
        SELECT story_id, COUNT(*) AS comment_count 
        FROM ${COMMENTS_TABLE} 
        WHERE COALESCE(is_deleted, false) = false 
        GROUP BY story_id
      ) c ON c.story_id = s.id
      LEFT JOIN ${LIKES_TABLE} ul ON ul.story_id = s.id AND (
        (ul.user_id IS NOT NULL AND ul.user_id = $${params.length + 1}) 
        OR (ul.emp_id IS NOT NULL AND ul.emp_id = $${params.length + 2})
      )
      ${whereSql}
      ORDER BY s.published_at DESC NULLS LAST, s.created_at DESC
    `;

    params.push(userInfo.userId, userInfo.empId);

    const result = await db.query(query, params);

    // Check attendance, comments and documents for each story
    const storyIds = result.rows.map((r) => String(r.id));
    let docsByStory = {};
    let commentsByStory = {};
    if (storyIds.length > 0) {
      const [docsRes, commRes] = await Promise.all([
        db.query(
          `SELECT final_doc_id, doc_purpose, file_path 
           FROM t_documents 
           WHERE CAST(final_doc_id AS TEXT) = ANY($1::text[]) AND deleted_at IS NULL AND doc_purpose IN ('cover_image', 'gallery_images')
           ORDER BY created_at ASC`,
          [storyIds]
        ),
        db.query(
          `SELECT id, story_id, user_name, user_avatar, user_dept, is_attendee, comment_text, parent_comment_id, created_at
           FROM ${COMMENTS_TABLE}
           WHERE CAST(story_id AS TEXT) = ANY($1::text[]) AND COALESCE(is_deleted, false) = false
           ORDER BY created_at ASC`,
          [storyIds]
        ),
      ]);

      docsRes.rows.forEach((d) => {
        const sid = String(d.final_doc_id);
        if (!docsByStory[sid]) docsByStory[sid] = {};
        if (!docsByStory[sid][d.doc_purpose]) docsByStory[sid][d.doc_purpose] = [];
        docsByStory[sid][d.doc_purpose].push(d.file_path);
      });

      commRes.rows.forEach((c) => {
        const sid = String(c.story_id);
        if (!commentsByStory[sid]) commentsByStory[sid] = [];
        commentsByStory[sid].push({
          ...c,
          comment: c.comment_text,
        });
      });
    }

    const stories = await Promise.all(
      result.rows.map(async (story) => {
        const effectiveEventId = story.event_id || story.parent_id;
        const isAttendee = await checkUserEventAttendance(effectiveEventId, userInfo);
        const storyDocs = docsByStory[String(story.id)] || {};
        const coverFromDocs = storyDocs.cover_image?.[storyDocs.cover_image.length - 1];
        return {
          ...story,
          cover_image: story.cover_image || coverFromDocs || null,
          gallery_images: story.gallery_images || storyDocs.gallery_images || [],
          comments: commentsByStory[String(story.id)] || [],
          event_display_title: story.event_name || (effectiveEventId ? `Event #${effectiveEventId}` : "Community Initiative"),
          user_is_attendee: isAttendee,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: stories,
      count: stories.length,
      current_user: userInfo,
    });
  } catch (error) {
    console.error("[getStories] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch impact stories",
      error: error.message,
    });
  }
};

/**
 * Get a single story by ID with full event info, likes, and verified comments
 */
exports.getStoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const userInfo = extractUser(req);

    // Fetch story
    const storyRes = await db.query(
      `SELECT s.*, 
              e.event_name,
              e.event_location,
              e.event_date,
              e.csr_theme AS event_category,
              e.event_type
       FROM ${STORY_TABLE} s
       LEFT JOIN ${EVENT_TABLE} e ON e.id = COALESCE(s.event_id, s.parent_id)
       WHERE s.id = $1`,
      [id]
    );

    if (storyRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Impact story not found" });
    }

    const story = storyRes.rows[0];

    // Check user attendance
    const effectiveEventId = story.event_id || story.parent_id;
    const isAttendee = await checkUserEventAttendance(effectiveEventId, userInfo);

    // Check if user liked
    const likeCheck = await db.query(
      `SELECT id FROM ${LIKES_TABLE} 
       WHERE story_id = $1 AND (
         (user_id IS NOT NULL AND user_id = $2) 
         OR (emp_id IS NOT NULL AND emp_id = $3)
       )`,
      [id, userInfo.userId, userInfo.empId]
    );
    const userHasLiked = likeCheck.rows.length > 0;

    // Fetch total likes & recent likers
    const likesCountRes = await db.query(
      `SELECT COUNT(*)::int AS count FROM ${LIKES_TABLE} WHERE story_id = $1`,
      [id]
    );
    const recentLikesRes = await db.query(
      `SELECT user_name, user_avatar, created_at 
       FROM ${LIKES_TABLE} 
       WHERE story_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [id]
    );

    // Fetch comments
    const commentsRes = await db.query(
      `SELECT id, story_id, event_id, user_id, emp_id, user_name, user_avatar, user_dept, is_attendee, comment_text, parent_comment_id, created_at 
       FROM ${COMMENTS_TABLE} 
       WHERE story_id = $1 AND is_deleted = false 
       ORDER BY created_at ASC`,
      [id]
    );

    // Fetch attached documents/photos
    const docsRes = await db.query(
      `SELECT tdoc_id, doc_purpose, file_path, file_name, file_original_path, doc_type 
       FROM t_documents 
       WHERE CAST(final_doc_id AS TEXT) = $1 AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [String(id)]
    );
    const documents = {};
    docsRes.rows.forEach((d) => {
      const purpose = d.doc_purpose || "attachments";
      if (!documents[purpose]) documents[purpose] = [];
      documents[purpose].push(d);
    });

    const coverFromDocs = documents.cover_image?.[documents.cover_image.length - 1]?.file_path;
    const galleryFromDocs = documents.gallery_images?.map((g) => g.file_path) || [];

    return res.status(200).json({
      success: true,
      data: {
        ...story,
        cover_image: story.cover_image || coverFromDocs || null,
        gallery_images: story.gallery_images || galleryFromDocs,
        documents,
        event_display_title: story.event_title || story.event_name || `Event #${story.event_id}`,
        like_count: likesCountRes.rows[0]?.count || 0,
        user_has_liked: userHasLiked,
        user_is_attendee: isAttendee,
        recent_likes: recentLikesRes.rows,
        comments: commentsRes.rows,
        current_user: userInfo,
      },
    });
  } catch (error) {
    console.error("[getStoryById] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch impact story details",
      error: error.message,
    });
  }
};

/**
 * Create or Update an Impact Story (Admin / FormBuilder action)
 */
exports.createOrUpdateStory = async (req, res) => {
  try {
    const userInfo = extractUser(req);
    const payload = req.body || {};

    let {
      id,
      event_id,
      story_title,
      story_slug,
      author_name,
      author_role,
      cover_image,
      excerpt,
      story_content,
      impact_highlights,
      featured_quote,
      quote_attribution,
      gallery_images,
      tags,
      status,
      read_time_minutes,
      allow_likes,
      show_likes,
      allow_comments,
      show_comments,
    } = payload;

    id = id || req.params?.id || null;

    // Handle file uploads if present (multer.any() returns an array)
    if (Array.isArray(req.files) && req.files.length > 0) {
      const coverFile = req.files.find((f) => f.fieldname === "cover_image");
      if (coverFile) {
        const up = await storageService.uploadFile({
          file: coverFile,
          folder: "volunteering-stories",
          docPurpose: "cover_image",
          createdBy: userInfo.userId,
        });
        cover_image = up.file_path || up.url || up.path;
      }

      const newGalleryFiles = req.files.filter((f) => f.fieldname === "gallery_images");
      if (newGalleryFiles.length > 0) {
        const urls = [];
        for (const file of newGalleryFiles) {
          const up = await storageService.uploadFile({
            file,
            folder: "volunteering-stories",
            docPurpose: "gallery_images",
            createdBy: userInfo.userId,
          });
          urls.push(up.file_path || up.url || up.path);
        }

        let existingGalleryList = [];
        if (payload.existing_gallery) {
          try {
            existingGalleryList = typeof payload.existing_gallery === "string" ? JSON.parse(payload.existing_gallery) : payload.existing_gallery;
          } catch (e) {
            existingGalleryList = [];
          }
        }
        gallery_images = [...(Array.isArray(existingGalleryList) ? existingGalleryList : []), ...urls];
      }
    } else if (payload.existing_gallery) {
      try {
        gallery_images = typeof payload.existing_gallery === "string" ? JSON.parse(payload.existing_gallery) : payload.existing_gallery;
      } catch (e) {
        gallery_images = [];
      }
    }

    if (!story_title) {
      return res.status(400).json({ success: false, message: "Story title is required" });
    }

    if (!story_slug) {
      story_slug = story_title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }

    author_name = author_name || userInfo.userName;
    author_role = author_role || "CSR Impact Lead";
    status = status || "Published";

    const isAllowLikes = allow_likes !== undefined ? String(allow_likes) !== "false" : true;
    const isShowLikes = show_likes !== undefined ? String(show_likes) !== "false" : true;
    const isAllowComments = allow_comments !== undefined ? String(allow_comments) !== "false" : true;
    const isShowComments = show_comments !== undefined ? String(show_comments) !== "false" : true;

    // Ensure JSON format for jsonb fields
    let parsedHighlights = [];
    try {
      parsedHighlights = typeof impact_highlights === "string" ? JSON.parse(impact_highlights) : (impact_highlights || []);
    } catch (e) {
      parsedHighlights = impact_highlights ? [String(impact_highlights)] : [];
    }

    let parsedGallery = [];
    try {
      parsedGallery = typeof gallery_images === "string" ? JSON.parse(gallery_images) : (gallery_images || []);
    } catch (e) {
      parsedGallery = gallery_images ? [String(gallery_images)] : [];
    }

    let parsedTags = [];
    try {
      parsedTags = typeof tags === "string" ? JSON.parse(tags) : (tags || []);
    } catch (e) {
      parsedTags = typeof tags === "string" ? tags.split(",").map((t) => t.trim()).filter(Boolean) : (tags || []);
    }

    if (id) {
      // Update
      const updateQuery = `
        UPDATE ${STORY_TABLE}
        SET 
          event_id = COALESCE($1, event_id),
          parent_id = COALESCE($1, parent_id, event_id),
          story_title = $2,
          story_slug = $3,
          author_name = $4,
          author_role = $5,
          cover_image = COALESCE($6, cover_image),
          excerpt = $7,
          story_content = $8,
          impact_highlights = $9,
          featured_quote = $10,
          quote_attribution = $11,
          gallery_images = $12,
          tags = $13,
          status = $14,
          read_time_minutes = $15,
          allow_likes = $16,
          show_likes = $17,
          allow_comments = $18,
          show_comments = $19,
          updated_at = NOW(),
          published_at = CASE WHEN LOWER($14) IN ('published', 'submit') AND published_at IS NULL THEN NOW() ELSE published_at END
        WHERE id = $20
        RETURNING *
      `;
      const result = await db.query(updateQuery, [
        event_id || null,
        story_title,
        story_slug,
        author_name,
        author_role,
        cover_image || null,
        excerpt || "",
        story_content || "",
        typeof parsedHighlights === "string" ? parsedHighlights : JSON.stringify(parsedHighlights),
        featured_quote || "",
        quote_attribution || "",
        typeof parsedGallery === "string" ? parsedGallery : JSON.stringify(parsedGallery),
        typeof parsedTags === "string" ? parsedTags : JSON.stringify(parsedTags),
        status,
        Number(read_time_minutes) || 3,
        isAllowLikes,
        isShowLikes,
        isAllowComments,
        isShowComments,
        id,
      ]);

      return res.status(200).json({
        success: true,
        message: "Impact story updated successfully",
        data: result.rows[0],
      });
    } else {
      // Insert
      const insertQuery = `
        INSERT INTO ${STORY_TABLE} (
          event_id,
          parent_id,
          story_title,
          story_slug,
          author_name,
          author_role,
          cover_image,
          excerpt,
          story_content,
          impact_highlights,
          featured_quote,
          quote_attribution,
          gallery_images,
          tags,
          status,
          read_time_minutes,
          allow_likes,
          show_likes,
          allow_comments,
          show_comments,
          published_at,
          created_at,
          updated_at
        ) VALUES (
          $1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19,
          CASE WHEN LOWER($14) IN ('published', 'submit') THEN NOW() ELSE NULL END,
          NOW(),
          NOW()
        ) RETURNING *
      `;
      const result = await db.query(insertQuery, [
        event_id || null,
        story_title,
        story_slug,
        author_name,
        author_role,
        cover_image || null,
        excerpt || "",
        story_content || "",
        typeof parsedHighlights === "string" ? parsedHighlights : JSON.stringify(parsedHighlights),
        featured_quote || "",
        quote_attribution || "",
        typeof parsedGallery === "string" ? parsedGallery : JSON.stringify(parsedGallery),
        typeof parsedTags === "string" ? parsedTags : JSON.stringify(parsedTags),
        status,
        Number(read_time_minutes) || 3,
        isAllowLikes,
        isShowLikes,
        isAllowComments,
        isShowComments,
      ]);

      return res.status(201).json({
        success: true,
        message: "Impact story published successfully",
        data: result.rows[0],
      });
    }
  } catch (error) {
    console.error("[createOrUpdateStory] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save impact story",
      error: error.message,
    });
  }
};

/**
 * Delete / Soft delete an Impact Story
 * Also cascades deletion to all associated comments and likes
 */
exports.deleteStory = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`UPDATE ${STORY_TABLE} SET deleted_at = NOW() WHERE id = $1`, [id]);
    await db.query(`UPDATE ${COMMENTS_TABLE} SET is_deleted = true, deleted_at = NOW(), updated_at = NOW() WHERE story_id = $1`, [id]);
    return res.status(200).json({
      success: true,
      message: "Impact story and comments deleted successfully",
    });
  } catch (error) {
    console.error("[deleteStory] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete impact story",
      error: error.message,
    });
  }
};

/**
 * Toggle Like on a Story
 * Any volunteer can like (or attendees receive verified like status)
 */
exports.toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userInfo = extractUser(req);

    // Fetch story to check permissions & get event_id
    const storyRes = await db.query(`SELECT event_id, allow_likes FROM ${STORY_TABLE} WHERE id = $1`, [id]);
    if (storyRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }

    if (storyRes.rows[0].allow_likes === false) {
      return res.status(403).json({ success: false, message: "Reactions and likes are disabled for this impact story" });
    }

    const eventId = storyRes.rows[0]?.event_id || null;

    // Check existing like
    const existing = await db.query(
      `SELECT id FROM ${LIKES_TABLE} 
       WHERE story_id = $1 AND (
         (user_id IS NOT NULL AND user_id = $2) 
         OR (emp_id IS NOT NULL AND emp_id = $3)
       )`,
      [id, userInfo.userId, userInfo.empId]
    );

    let liked = false;
    if (existing.rows.length > 0) {
      // Unlike
      await db.query(`DELETE FROM ${LIKES_TABLE} WHERE id = $1`, [existing.rows[0].id]);
      liked = false;
    } else {
      // Like
      await db.query(
        `INSERT INTO ${LIKES_TABLE} (story_id, event_id, user_id, emp_id, user_name, user_avatar, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [id, eventId, userInfo.userId, userInfo.empId, userInfo.userName, userInfo.avatar]
      );
      liked = true;
    }

    const countRes = await db.query(
      `SELECT COUNT(*)::int AS count FROM ${LIKES_TABLE} WHERE story_id = $1`,
      [id]
    );

    const totalLikes = countRes.rows[0]?.count || 0;

    return res.status(200).json({
      success: true,
      liked,
      like_count: totalLikes,
      data: {
        liked,
        like_count: totalLikes,
      },
      message: liked ? "Story liked" : "Story unliked",
    });
  } catch (error) {
    console.error("[toggleLike] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle like",
      error: error.message,
    });
  }
};

/**
 * Add Comment on a Story
 * Checks if the user attended the event:
 * - If user attended: marked with verified attendee badge (is_attendee = true)
 * - Users can comment to share their volunteer reflections
 */
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const comment_text = req.body?.comment_text || req.body?.comment;
    const userInfo = extractUser(req);

    if (!id || !comment_text || !comment_text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required",
      });
    }

    // Fetch story
    const storyRes = await db.query(`SELECT id, event_id, allow_comments FROM ${STORY_TABLE} WHERE id = $1`, [id]);
    if (storyRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }

    if (storyRes.rows[0].allow_comments === false) {
      return res.status(403).json({ success: false, message: "Comments are disabled for this impact story" });
    }

    const eventId = storyRes.rows[0].event_id;

    // Check attendance status
    const isAttendee = await checkUserEventAttendance(eventId, userInfo);

    const parent_comment_id = req.body?.parent_comment_id || null;

    // Insert comment
    const insertRes = await db.query(
      `INSERT INTO ${COMMENTS_TABLE} (
        story_id, event_id, user_id, emp_id, user_name, user_avatar, user_dept, is_attendee, comment_text, parent_comment_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *`,
      [
        id,
        eventId,
        userInfo.userId,
        userInfo.empId,
        userInfo.userName,
        userInfo.avatar,
        userInfo.department,
        isAttendee,
        comment_text.trim(),
        parent_comment_id,
      ]
    );

    const createdComment = {
      ...insertRes.rows[0],
      comment: insertRes.rows[0].comment_text,
    };

    return res.status(201).json({
      success: true,
      message: "Comment posted successfully",
      data: createdComment,
    });
  } catch (error) {
    console.error("[addComment] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to post comment",
      error: error.message,
    });
  }
};

/**
 * Soft delete a comment
 * Allowed for:
 * 1. Creator of the impact story (can delete any comment or reply on their story)
 * 2. Author of the comment / reply
 * 3. Administrator
 * 
 * Cascading: When a parent comment is deleted, all its child comments (replies) are also soft-deleted.
 */
exports.deleteComment = async (req, res) => {
  try {
    const { comment_id } = req.params;
    const userInfo = extractUser(req);

    // Fetch comment to check ownership and get story details
    const commRes = await db.query(
      `SELECT c.id, c.story_id, c.user_id, c.emp_id, c.user_name, c.parent_comment_id,
              s.created_by AS story_created_by, s.author_name AS story_author_name
       FROM ${COMMENTS_TABLE} c
       LEFT JOIN ${STORY_TABLE} s ON s.id = c.story_id
       WHERE c.id = $1`,
      [comment_id]
    );

    if (commRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    const comm = commRes.rows[0];

    const isCommentAuthor =
      (userInfo.userId && String(comm.user_id) === String(userInfo.userId)) ||
      (userInfo.empId && String(comm.emp_id) === String(userInfo.empId)) ||
      (userInfo.userName && comm.user_name === userInfo.userName);

    const isStoryCreator =
      (userInfo.userId && String(comm.story_created_by) === String(userInfo.userId)) ||
      (userInfo.empId && String(comm.story_created_by) === String(userInfo.empId)) ||
      (userInfo.userName && comm.story_author_name === userInfo.userName);

    const isAdmin =
      req.user?.is_admin === true ||
      req.user?.role === "admin" ||
      req.user?.role === "superadmin" ||
      req.user?.roles?.includes?.("admin");

    if (!isCommentAuthor && !isStoryCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this comment. Only the comment author, story creator, or administrator can delete comments.",
      });
    }

    // Soft delete the comment itself AND all child comments (replies) where parent_comment_id = comment_id
    const delRes = await db.query(
      `UPDATE ${COMMENTS_TABLE} 
       SET is_deleted = true, deleted_at = NOW(), updated_at = NOW() 
       WHERE (id = $1 OR CAST(parent_comment_id AS TEXT) = CAST($1 AS TEXT)) AND is_deleted = false
       RETURNING id`,
      [comment_id]
    );

    return res.status(200).json({
      success: true,
      message: "Comment and any child replies deleted successfully",
      deleted_count: delRes.rowCount,
    });
  } catch (error) {
    console.error("[deleteComment] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete comment",
      error: error.message,
    });
  }
};
