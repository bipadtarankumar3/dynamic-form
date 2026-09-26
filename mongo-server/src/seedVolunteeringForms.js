// mongo-server/src/seedVolunteeringForms.js
// Seeds Employee Volunteering Forms, Events, Event Types, and sample Stories
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const Form = require('./models/Form.model');
const FormSchema = require('./models/FormSchema.model');
const MasterSchema = require('./models/MasterSchema.model');
const MasterData = require('./models/MasterData.model');
const VolunteeringStory = require('./models/VolunteeringStory.model');
const { getFormCollection } = require('./utils/formCollection.util');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/csrdynamicform_db';

const EVENT_TYPES_SEED = [
  { type_code: 'TREE_PLANTATION', type_name: 'Tree plantation', color: '#16a34a', description: 'Tree plantation and urban greening drives' },
  { type_code: 'WATER_CONSERVATION', type_name: 'Water conservation', color: '#0284c7', description: 'Water body cleaning, rainwater harvesting and conservation' },
  { type_code: 'POND_RESTORATION', type_name: 'Pond restoration', color: '#0891b2', description: 'Desilting, revival and cleaning of rural/urban ponds' },
  { type_code: 'EDUCATION', type_name: 'Education', color: '#7c3aed', description: 'Remedial teaching, career guidance and literacy programs' },
  { type_code: 'SCHOOL_VOLUNTEERING', type_name: 'School volunteering', color: '#9333ea', description: 'School infrastructure painting, library setup and mentoring' },
  { type_code: 'HEALTH_CAMP', type_name: 'Health camp', color: '#dc2626', description: 'Free medical screening, eye care and dental checkups' },
  { type_code: 'COMMUNITY_DEVELOPMENT', type_name: 'Community development', color: '#ea580c', description: 'Sanitation, local outreach and community engagement' },
  { type_code: 'SKILL_DEVELOPMENT', type_name: 'Skill development', color: '#d97706', description: 'Vocational training, resume building and digital literacy' },
  { type_code: 'DONATION_DRIVE', type_name: 'Donation drive', color: '#ca8a04', description: 'Clothes, books, food and essential supplies distribution' },
  { type_code: 'CLEANLINESS_DRIVE', type_name: 'Cleanliness drive', color: '#059669', description: 'Swachh Bharat cleanliness and waste segregation drives' },
  { type_code: 'DISASTER_RELIEF', type_name: 'Disaster relief', color: '#e11d48', description: 'Emergency relief packaging and disaster response support' },
  { type_code: 'LIVELIHOOD_SUPPORT', type_name: 'Livelihood support', color: '#2563eb', description: 'Micro-enterprise support and artisan mentoring' },
  { type_code: 'OTHER', type_name: 'Other', color: '#475569', description: 'Other volunteering activities and campaigns' }
];

const VOLUNTEERING_FORMS = [
  // ── 1. Volunteering Program Form ────────────────────────────────
  {
    form_id: 'frm_vol_program_01',
    title: 'Volunteering Program',
    slug: 'volunteering_program',
    form_code: 'volunteering_program',
    table_name: 'volunteering_program',
    root_entity: {
      table: 'volunteering_program',
      modal_size: '1200',
      primary_key: 'id',
    },
    is_master: false,
    enable_approval: false,
    sections: [
      {
        section_id: 'sec_vol_program_info',
        section_label: 'Program Information',
        type: 'general',
        slug: 'volunteering_program_info',
        table: 'volunteering_program',
        primary_key: 'id',
        fields: [
          {
            id: 'fld_program_name',
            ui: { placeholder: 'Enter Program Name', icon: 'AimOutlined' },
            type: 'text',
            label: 'Program Name',
            visible: true,
            db_field: 'program_name',
            column_name: 'program_name',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_focus_area',
            ui: { placeholder: 'Select Focus Area' },
            type: 'select',
            label: 'Focus Area / SDG',
            visible: true,
            db_field: 'focus_area',
            column_name: 'focus_area',
            required: true,
            options: [
              { label: 'Environment & Climate Action', value: 'Environment' },
              { label: 'Quality Education', value: 'Education' },
              { label: 'Good Health & Well-being', value: 'Healthcare' },
              { label: 'Decent Work & Skill Growth', value: 'Skill Development' },
              { label: 'Community Relief & Disaster Support', value: 'Community Relief' },
            ],
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_prog_lead',
            ui: { placeholder: 'Enter Program SPOC name', icon: 'UserOutlined' },
            type: 'text',
            label: 'Program Lead / SPOC',
            visible: true,
            db_field: 'program_lead',
            column_name: 'program_lead',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_target_hours',
            ui: { placeholder: 'e.g. 5000', icon: 'ClockCircleOutlined' },
            type: 'number',
            label: 'Annual Target Volunteer Hours',
            visible: true,
            db_field: 'target_volunteer_hours',
            column_name: 'target_volunteer_hours',
            required: false,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_prog_status',
            type: 'select',
            label: 'Program Status',
            visible: true,
            db_field: 'status',
            column_name: 'status',
            default_value: 'Active',
            options: [
              { label: 'Active', value: 'Active' },
              { label: 'Draft', value: 'Draft' },
              { label: 'Completed', value: 'Completed' },
              { label: 'Archived', value: 'Archived' }
            ],
            add_to_query: true,
            add_to_list: true,
          }
        ]
      }
    ]
  },

  // ── 2. Volunteering Event Form ──────────────────────────────────
  {
    form_id: 'frm_vol_event_01',
    title: 'Volunteering Event',
    slug: 'volunteering_event',
    form_code: 'volunteering_event',
    table_name: 'volunteering_event',
    root_entity: {
      table: 'volunteering_event',
      modal_size: '1400',
      primary_key: 'id',
    },
    is_master: false,
    enable_approval: true,
    sections: [
      {
        section_id: 'sec_vol_event_details',
        section_label: 'Event Details & Logistics',
        type: 'general',
        slug: 'volunteering_event_details',
        table: 'volunteering_event',
        primary_key: 'id',
        fields: [
          {
            id: 'fld_event_title',
            ui: { placeholder: 'Enter Event Title', icon: 'SmileOutlined' },
            type: 'text',
            label: 'Event Title',
            visible: true,
            db_field: 'event_title',
            column_name: 'event_title',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_program_name',
            ui: { placeholder: 'Program Name' },
            type: 'text',
            label: 'Program',
            visible: true,
            db_field: 'program_name',
            column_name: 'program_name',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_event_date',
            type: 'date',
            label: 'Event Date',
            visible: true,
            db_field: 'event_date',
            column_name: 'event_date',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_location_name',
            ui: { placeholder: 'Venue name / Park / School', icon: 'EnvironmentOutlined' },
            type: 'text',
            label: 'Drive Venue / Location',
            visible: true,
            db_field: 'location_name',
            column_name: 'location_name',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_city',
            ui: { placeholder: 'City' },
            type: 'text',
            label: 'City',
            visible: true,
            db_field: 'city',
            column_name: 'city',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_volunteers_req',
            ui: { placeholder: 'Max Volunteers capacity', icon: 'TeamOutlined' },
            type: 'number',
            label: 'Volunteers Required',
            visible: true,
            db_field: 'volunteers_required',
            column_name: 'volunteers_required',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_event_status',
            type: 'select',
            label: 'Event Status',
            visible: true,
            db_field: 'status',
            column_name: 'status',
            default_value: 'Published',
            options: [
              { label: 'Draft', value: 'Draft' },
              { label: 'Pending Approval', value: 'Pending Approval' },
              { label: 'Published', value: 'Published' },
              { label: 'Completed', value: 'Completed' },
              { label: 'Closed', value: 'Closed' }
            ],
            add_to_query: true,
            add_to_list: true,
          }
        ]
      }
    ]
  },

  // ── 3. Volunteer Attendance & RSVP Form ───────────────────────────
  {
    form_id: 'frm_vol_rsvp_01',
    title: 'Volunteer Attendance & RSVP',
    slug: 'volunteering_event_volunteer',
    form_code: 'volunteering_event_volunteer',
    table_name: 'volunteering_event_volunteer',
    root_entity: {
      table: 'volunteering_event_volunteer',
      modal_size: '1200',
      primary_key: 'id',
    },
    is_master: false,
    enable_approval: false,
    sections: [
      {
        section_id: 'sec_vol_rsvp_details',
        section_label: 'Volunteer Attendance Info',
        type: 'general',
        slug: 'volunteer_rsvp_info',
        table: 'volunteering_event_volunteer',
        primary_key: 'id',
        fields: [
          {
            id: 'fld_event_id',
            type: 'text',
            label: 'Event Reference ID',
            visible: true,
            db_field: 'event_id',
            column_name: 'event_id',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_vol_name',
            type: 'text',
            label: 'Employee Name',
            visible: true,
            db_field: 'volunteer_name',
            column_name: 'volunteer_name',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_emp_id',
            type: 'text',
            label: 'Employee Code',
            visible: true,
            db_field: 'emp_id',
            column_name: 'emp_id',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_email',
            type: 'email',
            label: 'Email Address',
            visible: true,
            db_field: 'email',
            column_name: 'email',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_hours',
            type: 'number',
            label: 'Volunteered Hours',
            visible: true,
            db_field: 'hours_contributed',
            column_name: 'hours_contributed',
            default_value: 0,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_attendance_status',
            type: 'select',
            label: 'Attendance Status',
            visible: true,
            db_field: 'status',
            column_name: 'status',
            default_value: 'Registered',
            options: [
              { label: 'Registered', value: 'Registered' },
              { label: 'Attended', value: 'Attended' },
              { label: 'Cancelled', value: 'Cancelled' },
              { label: 'No-Show', value: 'No-Show' }
            ],
            add_to_query: true,
            add_to_list: true,
          }
        ]
      }
    ]
  }
];

async function seedVolunteeringForms() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB for Volunteering Forms Seeding');

  // 1. Seed Event Types Master Schema & Data
  await MasterSchema.findOneAndUpdate(
    { slug: 'event_type' },
    {
      name: 'Event Type Master',
      slug: 'event_type',
      label_field: 'type_name',
      fields: [
        { name: 'Type Code', key: 'type_code', type: 'text', required: true },
        { name: 'Type Name', key: 'type_name', type: 'text', required: true },
        { name: 'Color', key: 'color', type: 'text' },
        { name: 'Description', key: 'description', type: 'text' }
      ]
    },
    { new: true, upsert: true }
  );

  for (const et of EVENT_TYPES_SEED) {
    await MasterData.findOneAndUpdate(
      { master_slug: 'event_type', code: et.type_code },
      {
        master_slug: 'event_type',
        name: et.type_name,
        code: et.type_code,
        data: et
      },
      { new: true, upsert: true }
    );
  }
  console.log(`  ${EVENT_TYPES_SEED.length} Event Types seeded into MasterData ✓`);

  // 2. Seed Forms & Schemas
  for (const formData of VOLUNTEERING_FORMS) {
    const { sections, ...formMeta } = formData;

    const form = await Form.findOneAndUpdate(
      { form_code: formMeta.form_code },
      {
        ...formMeta,
        sections: sections || [],
        deleted_at: null
      },
      { new: true, upsert: true }
    );

    await FormSchema.findOneAndUpdate(
      { form_id: form._id },
      {
        form_id: form._id,
        form_code: form.form_code,
        slug: form.slug || form.form_code,
        title: form.title,
        table_name: form.table_name || form.form_code,
        sections: sections || [],
        version: 1,
        is_published: true
      },
      { new: true, upsert: true }
    );

    console.log(`  Form & Schema: "${form.title}" (${form.form_code}) with ${sections?.[0]?.fields?.length || 0} fields ✓`);
  }

  // 3. Seed Sample Volunteering Program
  const { Model: ProgramModel } = await getFormCollection('volunteering_program');
  const progDoc = await ProgramModel.findOneAndUpdate(
    { 'data.program_name': 'Green Earth Afforestation Initiative' },
    {
      data: {
        program_name: 'Green Earth Afforestation Initiative',
        focus_area: 'Environment',
        program_lead: 'Anita Desai',
        target_volunteer_hours: 5000,
        status: 'Active',
        description: 'Planting 50,000 indigenous trees across suburban urban forest belts.'
      },
      status: 'Active'
    },
    { new: true, upsert: true }
  );

  // 4. Seed Sample Volunteering Event
  const { Model: EventModel } = await getFormCollection('volunteering_event');
  const eventDoc = await EventModel.findOneAndUpdate(
    { 'data.event_title': 'Urban Forest Plantation Drive - Season 2025' },
    {
      data: {
        program_id: progDoc._id.toString(),
        program_name: 'Green Earth Afforestation Initiative',
        event_title: 'Urban Forest Plantation Drive - Season 2025',
        event_date: '2025-10-15',
        location_name: 'Aravalli Biodiversity Park',
        city: 'Gurugram',
        volunteers_required: 150,
        status: 'Published',
        description: 'Join hands with your colleagues to plant over 1,500 native saplings in a single day.'
      },
      status: 'Published'
    },
    { new: true, upsert: true }
  );

  // 5. Seed Sample Impact Story
  await VolunteeringStory.findOneAndUpdate(
    { event_id: eventDoc._id.toString() },
    {
      event_id: eventDoc._id.toString(),
      program_id: progDoc._id.toString(),
      story_title: '1,500 Native Trees Planted by 120 Corporate Volunteers in 4 Hours',
      excerpt: 'How our corporate volunteering squad turned barren park boundaries into thriving green canopy corridors.',
      content: '<p>On a crisp Saturday morning, 120 enthusiastic volunteers gathered at Aravalli Biodiversity Park to plant native species including Neem, Peepal, and Amaltas.</p><p>Equipped with gardening tools, saplings, and mulch, our cross-department teams planted 1,500 saplings with a 92% survival guarantee system maintained with local foresters.</p>',
      quote_text: 'Volunteering with the team gave me a profound sense of purpose. Seeing hundreds of saplings take root is unforgettable.',
      quote_author: 'Rohit Sharma',
      quote_author_role: 'Lead Cloud Architect & Green Champion',
      author_name: 'CSR Sustainability Team',
      status: 'published',
      tags: ['Environment', 'PlantationDrive', 'SDG13', 'ClimateAction'],
      likes_count: 42,
      comments_count: 5,
      views_count: 320,
      published_at: new Date()
    },
    { new: true, upsert: true }
  );
  console.log('  Sample Volunteering Program, Event & Impact Story seeded ✓');

  console.log('\n✨ Volunteering forms & sample stories seeded successfully!');
  await mongoose.disconnect();
}

if (require.main === module) {
  seedVolunteeringForms().catch(err => {
    console.error('❌ seedVolunteeringForms failed:', err);
    process.exit(1);
  });
}

module.exports = { seedVolunteeringForms };
