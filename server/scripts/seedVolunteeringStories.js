// server/scripts/seedVolunteeringStories.js
// ============================================================
// Employee Volunteering Impact Story & Social Interactions Seeder
// Seeds:
//  1. t_frm_volunteering_impact_story (WordPress-like post entity)
//  2. t_volunteering_story_likes (Likes on stories)
//  3. t_volunteering_story_comments (Comments on stories)
//  4. t_form, t_section, t_modules, t_permissions for FormBuilder
//  5. Rich sample impact stories with realistic likes and comments
// ============================================================

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { sequelize } = require("../src/config/db.config");

const IMPACT_STORY_FORM = {
  form_id: "frm_vol_story_01",
  title: "Volunteering Impact Story",
  slug: "volunteering_impact_story",
  root_entity: {
    table: "t_frm_volunteering_impact_story",
    modal_size: "1200",
    primary_key: "id",
    parent_table: "t_frm_volunteering_event",
    foreign_key: "event_id"
  },
  is_master: false,
  enable_approval: false,
  sections: [
    {
      section_id: "sec_vol_story_meta",
      section_label: "Story Title & Publication Details",
      type: "general",
      slug: "volunteering_story_meta",
      table: "t_frm_volunteering_impact_story",
      primary_key: "id",
      relation: {
        type: "many_to_one",
        foreign_key: "event_id",
        parent_table: "t_frm_volunteering_event"
      },
      fields: [
        {
          id: "fld_story_title",
          ui: { placeholder: "e.g. Mangrove Revival: 500 Saplings Planted Along Coastline", icon: "FileTextOutlined" },
          type: "text",
          label: "Story Title / Headline",
          visible: true,
          db_field: "story_title",
          messages: { required: "Story Title is required" },
          required: true,
          data_type: "varchar(255)",
          column_name: "story_title",
          add_to_query: true,
          add_to_list: true
        },
        {
          id: "fld_story_slug",
          ui: { placeholder: "e.g. mangrove-revival-500-saplings-planted" },
          type: "text",
          label: "Story Permalink / Slug",
          visible: true,
          db_field: "story_slug",
          required: false,
          data_type: "varchar(255)",
          column_name: "story_slug",
          add_to_query: true
        },
        {
          id: "fld_author_name",
          ui: { placeholder: "e.g. CSR Communications Team", icon: "UserOutlined" },
          type: "text",
          label: "Author / Reporter",
          visible: true,
          db_field: "author_name",
          messages: { required: "Author name is required" },
          required: true,
          data_type: "varchar(255)",
          column_name: "author_name",
          add_to_query: true,
          add_to_list: true
        },
        {
          id: "fld_author_role",
          ui: { placeholder: "e.g. Sustainability Lead / Volunteer Coordinator" },
          type: "text",
          label: "Author Role / Department",
          visible: true,
          db_field: "author_role",
          required: false,
          data_type: "varchar(255)",
          column_name: "author_role",
          add_to_query: true
        },
        {
          id: "fld_cover_image",
          ui: { placeholder: "Upload or paste Cover Image URL", icon: "PictureOutlined" },
          type: "file",
          label: "Hero / Cover Photo",
          visible: true,
          db_field: "cover_image",
          required: false,
          data_type: "text",
          column_name: "cover_image",
          add_to_query: true
        },
        {
          id: "fld_story_status",
          ui: { placeholder: "Select Publication Status" },
          type: "select",
          label: "Status",
          visible: true,
          db_field: "status",
          required: true,
          data_type: "varchar(50)",
          column_name: "status",
          add_to_query: true,
          add_to_list: true,
          options: [
            { label: "Published", value: "PUBLISHED" },
            { label: "Draft", value: "DRAFT" },
            { label: "Archived", value: "ARCHIVED" }
          ]
        }
      ]
    },
    {
      section_id: "sec_vol_story_content",
      section_label: "Story Narrative, Quotes & Impact Highlights",
      type: "general",
      slug: "volunteering_story_content",
      table: "t_frm_volunteering_impact_story",
      primary_key: "id",
      fields: [
        {
          id: "fld_excerpt",
          ui: { placeholder: "Brief 2-3 sentence overview of the impact achievement..." },
          type: "textarea",
          label: "Story Summary / Excerpt",
          visible: true,
          db_field: "excerpt",
          required: false,
          data_type: "text",
          column_name: "excerpt",
          add_to_query: true,
          add_to_list: true
        },
        {
          id: "fld_story_content",
          ui: { placeholder: "Write full story article, on-ground journey, challenges overcome, and beneficiary quotes..." },
          type: "textarea",
          label: "Full Story Article / Narrative (WordPress style)",
          visible: true,
          db_field: "story_content",
          required: true,
          data_type: "text",
          column_name: "story_content",
          add_to_query: true
        },
        {
          id: "fld_impact_highlights",
          ui: { placeholder: "e.g. • 500 Saplings planted\n• 45 Volunteers participated\n• 180 Hours logged" },
          type: "textarea",
          label: "Key Impact Metrics & Highlights",
          visible: true,
          db_field: "impact_highlights",
          required: false,
          data_type: "text",
          column_name: "impact_highlights",
          add_to_query: true
        },
        {
          id: "fld_featured_quote",
          ui: { placeholder: "Featured quote from on-ground volunteer..." },
          type: "textarea",
          label: "Featured Volunteer Testimonial Quote",
          visible: true,
          db_field: "featured_quote",
          required: false,
          data_type: "text",
          column_name: "featured_quote",
          add_to_query: true
        },
        {
          id: "fld_quote_attribution",
          ui: { placeholder: "e.g. Priya Nair, Software Engineer & Volunteer Champion" },
          type: "text",
          label: "Quote Attribution",
          visible: true,
          db_field: "quote_attribution",
          required: false,
          data_type: "varchar(255)",
          column_name: "quote_attribution",
          add_to_query: true
        },
        {
          id: "fld_gallery_images",
          ui: { placeholder: "Upload on-ground photo gallery" },
          type: "file",
          label: "Activity Photo Gallery",
          visible: true,
          db_field: "gallery_images",
          required: false,
          data_type: "text",
          column_name: "gallery_images",
          add_to_query: true
        },
        {
          id: "fld_tags",
          ui: { placeholder: "e.g. Environment, Youth, Healthcare, Coastal Conservation" },
          type: "text",
          label: "Tags & Themes",
          visible: true,
          db_field: "tags",
          required: false,
          data_type: "varchar(255)",
          column_name: "tags",
          add_to_query: true
        }
      ]
    }
  ]
};

async function seedVolunteeringStories() {
  console.log("\n============================================================");
  console.log("🌱 SEEDING VOLUNTEERING IMPACT STORIES & SOCIAL INTERACTIONS");
  console.log("============================================================\n");

  const query = async (sql, replacements = {}) => {
    return sequelize.query(sql, { replacements, type: sequelize.QueryTypes.RAW });
  };

  try {
    // 1. Create t_frm_volunteering_impact_story table
    console.log("1. Creating physical table: t_frm_volunteering_impact_story...");
    await query(`
      CREATE TABLE IF NOT EXISTS t_frm_volunteering_impact_story (
        id SERIAL PRIMARY KEY,
        event_id INT,
        story_title VARCHAR(255) NOT NULL,
        story_slug VARCHAR(255),
        author_name VARCHAR(255) DEFAULT 'CSR Communications Team',
        author_role VARCHAR(255) DEFAULT 'CSR Impact Lead',
        cover_image TEXT,
        excerpt TEXT,
        story_content TEXT,
        impact_highlights TEXT,
        featured_quote TEXT,
        quote_attribution VARCHAR(255),
        gallery_images TEXT,
        tags VARCHAR(255),
        status VARCHAR(50) DEFAULT 'PUBLISHED',
        view_count INT DEFAULT 0,
        published_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        created_by INT DEFAULT 1,
        updated_by INT DEFAULT 1,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITHOUT TIME ZONE
      );
    `);

    await query(`ALTER TABLE t_frm_volunteering_impact_story ADD COLUMN IF NOT EXISTS event_id INT;`);
    await query(`ALTER TABLE t_frm_volunteering_impact_story ADD COLUMN IF NOT EXISTS author_role VARCHAR(255);`);
    await query(`ALTER TABLE t_frm_volunteering_impact_story ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0;`);
    await query(`ALTER TABLE t_frm_volunteering_impact_story ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();`);
    await query(`ALTER TABLE t_frm_volunteering_impact_story ADD COLUMN IF NOT EXISTS read_time_minutes INT DEFAULT 3;`);
    await query(`ALTER TABLE t_frm_volunteering_impact_story ADD COLUMN IF NOT EXISTS allow_likes BOOLEAN DEFAULT TRUE;`);
    await query(`ALTER TABLE t_frm_volunteering_impact_story ADD COLUMN IF NOT EXISTS show_likes BOOLEAN DEFAULT TRUE;`);
    await query(`ALTER TABLE t_frm_volunteering_impact_story ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN DEFAULT TRUE;`);
    await query(`ALTER TABLE t_frm_volunteering_impact_story ADD COLUMN IF NOT EXISTS show_comments BOOLEAN DEFAULT TRUE;`);
    await query(`ALTER TABLE t_volunteering_impact_story ADD COLUMN IF NOT EXISTS read_time_minutes INT DEFAULT 3;`);
    await query(`ALTER TABLE t_volunteering_impact_story ADD COLUMN IF NOT EXISTS allow_likes BOOLEAN DEFAULT TRUE;`);
    await query(`ALTER TABLE t_volunteering_impact_story ADD COLUMN IF NOT EXISTS show_likes BOOLEAN DEFAULT TRUE;`);
    await query(`ALTER TABLE t_volunteering_impact_story ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN DEFAULT TRUE;`);
    await query(`ALTER TABLE t_volunteering_impact_story ADD COLUMN IF NOT EXISTS show_comments BOOLEAN DEFAULT TRUE;`);

    // 2. Create t_volunteering_story_likes table
    console.log("2. Creating physical table: t_volunteering_story_likes...");
    await query(`
      CREATE TABLE IF NOT EXISTS t_volunteering_story_likes (
        id SERIAL PRIMARY KEY,
        story_id INT NOT NULL,
        event_id INT,
        user_id INT,
        emp_id VARCHAR(100),
        user_name VARCHAR(255),
        user_avatar TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        CONSTRAINT uq_story_user_like UNIQUE (story_id, emp_id)
      );
    `);

    // 3. Create t_volunteering_story_comments table
    console.log("3. Creating physical table: t_volunteering_story_comments...");
    await query(`
      CREATE TABLE IF NOT EXISTS t_volunteering_story_comments (
        id SERIAL PRIMARY KEY,
        story_id INT NOT NULL,
        event_id INT,
        user_id INT,
        emp_id VARCHAR(100),
        user_name VARCHAR(255),
        user_avatar TEXT,
        user_dept VARCHAR(255),
        is_attendee BOOLEAN DEFAULT TRUE,
        comment_text TEXT NOT NULL,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITHOUT TIME ZONE
      );
    `);

    // 4. Register in t_form and t_section for FormBuilder
    console.log("4. Registering Impact Story Form in FormBuilder (t_form, t_section)...");
    const rootEntityStr = JSON.stringify(IMPACT_STORY_FORM.root_entity);

    await query(`
      INSERT INTO t_form (
        form_id, title, slug, root_entity, is_master, enable_approval,
        is_active, created_by, updated_by, created_at, updated_at
      ) VALUES (
        :form_id, :title, :slug, :root_entity::jsonb, :is_master, :enable_approval,
        TRUE, 1, 1, NOW(), NOW()
      ) ON CONFLICT (form_id) DO UPDATE SET
        title = EXCLUDED.title,
        slug = EXCLUDED.slug,
        root_entity = EXCLUDED.root_entity,
        is_master = EXCLUDED.is_master,
        enable_approval = EXCLUDED.enable_approval,
        updated_at = NOW();
    `, {
      form_id: IMPACT_STORY_FORM.form_id,
      title: IMPACT_STORY_FORM.title,
      slug: IMPACT_STORY_FORM.slug,
      root_entity: rootEntityStr,
      is_master: IMPACT_STORY_FORM.is_master,
      enable_approval: IMPACT_STORY_FORM.enable_approval
    });
    console.log(`   ✓ Upserted FormBuilder form: ${IMPACT_STORY_FORM.slug}`);

    // Upsert Sections
    for (const sec of IMPACT_STORY_FORM.sections) {
      const relStr = sec.relation ? JSON.stringify(sec.relation) : null;
      const fieldsStr = JSON.stringify(sec.fields);

      await query(`
        INSERT INTO t_section (
          section_id, section_form_id, section_label, type, slug, "table",
          primary_key, relation, fields, is_active, created_by, updated_by, created_at, updated_at
        ) VALUES (
          :section_id, :form_id, :section_label, :type, :slug, :table,
          :primary_key, :relation::jsonb, :fields::jsonb, TRUE, 1, 1, NOW(), NOW()
        ) ON CONFLICT (section_id) DO UPDATE SET
          section_label = EXCLUDED.section_label,
          type = EXCLUDED.type,
          slug = EXCLUDED.slug,
          "table" = EXCLUDED."table",
          primary_key = EXCLUDED.primary_key,
          relation = EXCLUDED.relation,
          fields = EXCLUDED.fields,
          updated_at = NOW();
      `, {
        section_id: sec.section_id,
        form_id: IMPACT_STORY_FORM.form_id,
        section_label: sec.section_label,
        type: sec.type,
        slug: sec.slug,
        table: sec.table,
        primary_key: sec.primary_key,
        relation: relStr,
        fields: fieldsStr
      });
    }
    console.log(`   ✓ Seeded ${IMPACT_STORY_FORM.sections.length} FormBuilder sections for Impact Stories`);

    // 5. Seed High Quality Sample Impact Stories linked to Events
    console.log("5. Seeding realistic sample impact stories...");
    
    // Find published events
    const [events] = await query(`SELECT id, event_id, event_name, csr_theme, event_location FROM t_frm_volunteering_event WHERE deleted_at IS NULL ORDER BY id ASC LIMIT 5`);
    
    const sampleStories = [
      {
        event_idx: 0,
        story_title: "Breathing Life into Urban Greenery: 500 Mangrove Saplings Planted at Coastal Belt",
        story_slug: "breathing-life-into-urban-greenery-mangrove-revival",
        author_name: "Priya Nair",
        author_role: "Sustainability & CSR Lead",
        cover_image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200&auto=format&fit=crop&q=80",
        excerpt: "Over 45 passionate employee volunteers joined hands with local coastal ecologists to plant 500 indigenous mangrove saplings and clean 120 kg of tidal plastic waste.",
        story_content: `On a crisp Saturday morning, our employee volunteering cohort gathered at the coastal wetland reserve with a single shared mission: revitalizing our fragile coastal ecosystem through hands-on reforestation.

Mangrove forests act as crucial carbon sinks and natural storm surge barriers for surrounding communities. Armed with biodegradable sapling pods and protective equipment, our volunteers waded into the tidal wetlands alongside certified marine biologists.

Throughout the 4-hour morning drive, volunteers achieved extraordinary milestones:
1. Planted 500 indigenous Rhizophora and Avicennia mangrove saplings across 2.5 hectares.
2. Retrieved and segregated over 120 kg of non-biodegradable plastics from the shoreline.
3. Conducted water salinity and soil health testing with local school children.

The enthusiasm and camaraderie demonstrated by our volunteers was contagious. Team members from Engineering, HR, and Operations worked shoulder-to-shoulder, reaffirming our corporate commitment to environmental stewardship and collective social impact.`,
        impact_highlights: "🌱 500 Mangrove Saplings Planted\n♻️ 120 kg Plastic Waste Cleared\n👥 45 Employee Volunteers Participated\n⏱️ 180 Verified Social Impact Hours",
        featured_quote: "Wading into the wetlands and physically planting hundreds of mangrove saplings with our colleagues made me realize how tangible our company's CSR commitments really are.",
        quote_attribution: "Amitav Sengupta, Senior Systems Architect",
        gallery_images: JSON.stringify([
          "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=800&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800&auto=format&fit=crop&q=80"
        ]),
        tags: "Environment, Mangrove Revival, Sustainability, Climate Action",
        status: "PUBLISHED"
      },
      {
        event_idx: 1,
        story_title: "Empowering 120 Rural School Children with Digital Literacy & STEM Science Kits",
        story_slug: "empowering-rural-school-children-stem-digital-literacy",
        author_name: "Rahul Verma",
        author_role: "CSR Program Manager",
        cover_image: "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1200&auto=format&fit=crop&q=80",
        excerpt: "A transformative weekend outreach where 30 employee mentors set up a modern computer lab and conducted hands-on science experiments for 120 enthusiastic students.",
        story_content: `Bridging the educational divide requires active involvement and sustained mentorship. This weekend, our volunteers traveled to Government High School, Kurla to inaugurate a 15-terminal solar-powered digital computer lab and conduct an immersive science fair.

Our team conducted four interactive workshops:
- Introduction to Scratch visual coding and interactive storytelling.
- Hands-on physics and chemistry demonstrations using eco-friendly DIY kits.
- Clean health & hygiene awareness and distribution of comprehensive nutrition kits.
- Career guidance and inspirational storytelling sessions by tech leaders.

The sparkle in the children's eyes when their first computer program ran successfully is an experience none of our volunteers will ever forget.`,
        impact_highlights: "💻 15 Computers Installed in Modern Lab\n🎒 120 STEM & Nutrition Kits Distributed\n👩‍🏫 30 Volunteer Mentors Engaged\n⭐ 100% Student Participation & Feedback",
        featured_quote: "Watching a 10-year-old child write her first block of code and smile with sheer wonder is the most rewarding experience of my entire professional career.",
        quote_attribution: "Sneha Mukherjee, Lead UI/UX Designer",
        gallery_images: JSON.stringify([
          "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80"
        ]),
        tags: "Education, STEM, Digital Literacy, Youth Empowerment",
        status: "PUBLISHED"
      }
    ];

    for (let i = 0; i < sampleStories.length; i++) {
      const s = sampleStories[i];
      const targetEvent = events && events[s.event_idx] ? events[s.event_idx] : (events && events[0] ? events[0] : { id: 1 });
      const eventId = targetEvent.id;

      const [existingStory] = await query(
        `SELECT id FROM t_frm_volunteering_impact_story WHERE story_slug = :slug LIMIT 1`,
        { slug: s.story_slug }
      );

      let storyId;
      if (existingStory && existingStory.length > 0) {
        storyId = existingStory[0].id;
        await query(
          `UPDATE t_frm_volunteering_impact_story SET
            event_id = :event_id,
            story_title = :story_title,
            author_name = :author_name,
            author_role = :author_role,
            cover_image = :cover_image,
            excerpt = :excerpt,
            story_content = :story_content,
            impact_highlights = :impact_highlights,
            featured_quote = :featured_quote,
            quote_attribution = :quote_attribution,
            gallery_images = :gallery_images,
            tags = :tags,
            status = 'PUBLISHED',
            updated_at = NOW()
          WHERE id = :id`,
          {
            id: storyId,
            event_id: eventId,
            story_title: s.story_title,
            author_name: s.author_name,
            author_role: s.author_role,
            cover_image: s.cover_image,
            excerpt: s.excerpt,
            story_content: s.story_content,
            impact_highlights: s.impact_highlights,
            featured_quote: s.featured_quote,
            quote_attribution: s.quote_attribution,
            gallery_images: s.gallery_images,
            tags: s.tags
          }
        );
        console.log(`   ✓ Updated Story #${storyId}: "${s.story_title.substring(0, 45)}..."`);
      } else {
        const [insertRes] = await query(
          `INSERT INTO t_frm_volunteering_impact_story (
            event_id, story_title, story_slug, author_name, author_role, cover_image, excerpt,
            story_content, impact_highlights, featured_quote, quote_attribution, gallery_images,
            tags, status, published_at, created_at, updated_at
          ) VALUES (
            :event_id, :story_title, :story_slug, :author_name, :author_role, :cover_image, :excerpt,
            :story_content, :impact_highlights, :featured_quote, :quote_attribution, :gallery_images,
            :tags, 'PUBLISHED', NOW(), NOW(), NOW()
          ) RETURNING id`,
          {
            event_id: eventId,
            story_title: s.story_title,
            story_slug: s.story_slug,
            author_name: s.author_name,
            author_role: s.author_role,
            cover_image: s.cover_image,
            excerpt: s.excerpt,
            story_content: s.story_content,
            impact_highlights: s.impact_highlights,
            featured_quote: s.featured_quote,
            quote_attribution: s.quote_attribution,
            gallery_images: s.gallery_images,
            tags: s.tags
          }
        );
        storyId = insertRes && insertRes[0] ? insertRes[0].id : 1;
        console.log(`   ✓ Inserted Story #${storyId}: "${s.story_title.substring(0, 45)}..."`);
      }

      // Seed Likes for Story
      await query(`
        INSERT INTO t_volunteering_story_likes (story_id, event_id, user_id, emp_id, user_name, user_avatar)
        VALUES 
          (:story_id, :event_id, 1, 'EMP-1042', 'Priya Nair', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120'),
          (:story_id, :event_id, 2, 'EMP-1088', 'Amitav Sengupta', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120'),
          (:story_id, :event_id, 3, 'EMP-1015', 'Sneha Mukherjee', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120')
        ON CONFLICT (story_id, emp_id) DO NOTHING;
      `, { story_id: storyId, event_id: eventId });

      // Seed Comments for Story
      await query(`
        INSERT INTO t_volunteering_story_comments (story_id, event_id, user_id, emp_id, user_name, user_avatar, user_dept, is_attendee, comment_text, created_at)
        VALUES 
          (:story_id, :event_id, 2, 'EMP-1088', 'Amitav Sengupta', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120', 'Engineering', TRUE, 'Incredible experience participating in this event! Seeing our whole team work together for environmental conservation was truly inspiring.', NOW() - INTERVAL '2 hours'),
          (:story_id, :event_id, 3, 'EMP-1015', 'Sneha Mukherjee', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120', 'Design & Product', TRUE, 'Proud to be part of such a well-organized initiative. Looking forward to the next follow-up planting session!', NOW() - INTERVAL '1 hour')
        ON CONFLICT DO NOTHING;
      `, { story_id: storyId, event_id: eventId });
    }

    console.log("\n============================================================");
    console.log("✅ VOLUNTEERING IMPACT STORIES SEEDED SUCCESSFULLY!");
    console.log("============================================================\n");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding volunteering stories:", err);
    process.exit(1);
  }
}

seedVolunteeringStories();
