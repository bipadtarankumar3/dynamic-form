// client/src/modules/volunteering/constants/volunteeringConstants.js

export const EVENT_TYPES = [
  { id: "tree_plantation", name: "Tree plantation", color: "#16a34a", icon: "EnvironmentOutlined" },
  { id: "water_conservation", name: "Water conservation", color: "#0284c7", icon: "CloudOutlined" },
  { id: "pond_restoration", name: "Pond restoration", color: "#0891b2", icon: "CompassOutlined" },
  { id: "education", name: "Education", color: "#7c3aed", icon: "ReadOutlined" },
  { id: "school_volunteering", name: "School volunteering", color: "#9333ea", icon: "BookOutlined" },
  { id: "health_camp", name: "Health camp", color: "#dc2626", icon: "MedicineBoxOutlined" },
  { id: "community_development", name: "Community development", color: "#ea580c", icon: "TeamOutlined" },
  { id: "skill_development", name: "Skill development", color: "#d97706", icon: "ThunderboltOutlined" },
  { id: "donation_drive", name: "Donation drive", color: "#ca8a04", icon: "GiftOutlined" },
  { id: "cleanliness_drive", name: "Cleanliness drive", color: "#059669", icon: "ClearOutlined" },
  { id: "disaster_relief", name: "Disaster relief", color: "#e11d48", icon: "AlertOutlined" },
  { id: "livelihood_support", name: "Livelihood support", color: "#2563eb", icon: "SmileOutlined" },
  { id: "other", name: "Other", color: "#475569", icon: "AppstoreOutlined" }
];

export const CSR_THEMES = [
  "Environment & Sustainability",
  "Water & Sanitation",
  "Education & Literacy",
  "Healthcare & Nutrition",
  "Community Development",
  "Skill & Livelihood",
  "Disaster Management",
  "Women Empowerment",
  "Animal Welfare",
  "Other"
];

export const APPROVAL_STATUSES = {
  DRAFT: { label: "Draft", color: "default", step: 0 },
  PENDING_APPROVAL: { label: "Pending Approval", color: "warning", step: 1 },
  APPROVED: { label: "Approved", color: "cyan", step: 2 },
  PUBLISHED: { label: "Published & Open", color: "success", step: 3 },
  IN_PROGRESS: { label: "In Progress", color: "gold", step: 4 },
  COMPLETED: { label: "Completed", color: "blue", step: 5 },
  CLOSED: { label: "Closed", color: "purple", step: 6 },
  REJECTED: { label: "Rejected", color: "error", step: -1 }
};

export const DEFAULT_BUDGET_HEADS = [
  "Logistics & Transport",
  "Materials & Plantation Kits",
  "Refreshments & Water",
  "Safety & First Aid",
  "Audio/Visual & Venue Setup",
  "Trainer / Expert Honorarium",
  "Volunteer T-Shirts & Badges",
  "Waste Management & Cleanup",
  "Miscellaneous / Buffer"
];

export const DEFAULT_BUDGET_UNITS = [
  "Units",
  "Persons",
  "Hours",
  "Days",
  "Trips",
  "Kits",
  "Lump sum"
];

/**
 * Fallback dynamic FormBuilder schema for Volunteering Program
 */
export const VOLUNTEERING_PROGRAM_SCHEMA = {
  form_name: "Volunteering Program",
  form_slug: "volunteering_program",
  sections: [
    {
      section_id: "sec_prog_basic",
      section_label: "Program Information",
      columns: 2,
      fields: [
        { key: "program_id", label: "Program ID", type: "text", required: true, is_unique: true, placeholder: "e.g. VP-2025-001" },
        { key: "program_name", label: "Program Name", type: "text", required: true, placeholder: "e.g. Annual Green Canopy Initiative" },
        { key: "csr_theme", label: "CSR Theme", type: "select", options: CSR_THEMES, required: true },
        { key: "financial_year", label: "Financial Year", type: "select", options: ["2024-2025", "2025-2026", "2026-2027"], required: true },
        { key: "objective", label: "Objective", type: "textarea", span: 2, required: true, placeholder: "State overarching program goal and mission" },
        { key: "target_employees", label: "Target Employees", type: "number", min: 1, required: true },
        { key: "target_events", label: "Target Events", type: "number", min: 1, required: true },
        { key: "target_volunteer_hours", label: "Target Volunteer Hours", type: "number", min: 1, required: true },
        { key: "target_beneficiaries", label: "Target Beneficiaries", type: "number", min: 0 },
        { key: "overall_budget", label: "Budget (INR)", type: "number", min: 0, required: true },
        { key: "program_manager", label: "Program Manager", type: "text", placeholder: "Responsible manager name" },
        { key: "start_date", label: "Start Date", type: "date", required: true },
        { key: "end_date", label: "End Date", type: "date", required: true },
        { key: "status", label: "Status", type: "select", options: ["Draft", "Active", "Closed"], defaultValue: "Active" }
      ]
    }
  ]
};

/**
 * Fallback dynamic FormBuilder schema for Volunteering Event Creation
 */
export const VOLUNTEERING_EVENT_SCHEMA = {
  form_name: "Event Creation",
  form_slug: "volunteering_event",
  sections: [
    {
      section_id: "sec_event_basic",
      section_label: "Basic Information",
      columns: 3,
      fields: [
        { key: "event_id", label: "Event ID", type: "text", required: true, is_unique: true, placeholder: "e.g. EVT-2025-010" },
        { key: "event_name", label: "Event Name", type: "text", required: true, placeholder: "e.g. Mangrove Plantation & Cleanliness Drive" },
        { key: "program_name", label: "Program", type: "select", options: ["Annual Green Canopy Initiative", "STEM & Digital Literacy in Rural Schools", "Community Health & Nutrition Outreach"], required: true },
        { key: "csr_theme", label: "CSR Theme", type: "select", options: CSR_THEMES, required: true },
        { key: "event_type", label: "Event Type", type: "select", options: EVENT_TYPES.map(t => t.name), required: true }
      ]
    },
    {
      section_id: "sec_event_desc",
      section_label: "Event Description & Volunteers",
      columns: 2,
      fields: [
        { key: "objective", label: "Objective", type: "textarea", span: 2, required: true },
        { key: "event_date", label: "Event Date", type: "date", required: true },
        { key: "start_time", label: "Start Time", type: "time", required: true },
        { key: "end_time", label: "End Time", type: "time", required: true },
        { key: "registration_deadline", label: "Registration Deadline", type: "datetime", required: true },
        { key: "max_volunteers", label: "Maximum Volunteers", type: "number", required: true, min: 1 },
        { key: "min_volunteers", label: "Minimum Volunteers", type: "number", min: 1 },
        { key: "target_employee_groups", label: "Target Employee Groups", type: "multi_select", options: ["All Employees", "Engineering & Tech", "Operations & Logistics", "Corporate & HR", "Sales & Marketing"] },
        { key: "implementing_ngo", label: "Implementing NGO", type: "text", placeholder: "e.g. Green Earth Foundation" },
        { key: "event_coordinator", label: "Event Coordinator", type: "text" },
        { key: "contact_person", label: "Contact Person (Phone/Email)", type: "text" }
      ]
    },
    {
      section_id: "sec_event_venue",
      section_label: "Venue & Location",
      columns: 2,
      fields: [
        { key: "event_location", label: "Event Location", type: "text", required: true, placeholder: "e.g. Mahim Nature Park, Mumbai" },
        { key: "lat_lon", label: "Lat / Lon", type: "text", placeholder: "19.0448, 72.8550" },
        { key: "meeting_point", label: "Meeting Point", type: "text", placeholder: "Gate 1 Parking Lot" },
        { key: "distance_from_office", label: "Distance from Office (km)", type: "number" },
        { key: "address", label: "Full Address", type: "textarea", span: 2 }
      ]
    },
    {
      section_id: "sec_event_objectives",
      section_label: "Event Objectives",
      columns: 1,
      fields: [
        { key: "detailed_objectives", label: "Detailed Objectives & Deliverables", type: "textarea", rows: 3 }
      ]
    },
    {
      section_id: "sec_event_budget",
      section_label: "Event Budget",
      type: "add_more",
      is_repeatable: true,
      fields: [
        { key: "budget_head", label: "Budget Head", type: "select", options: DEFAULT_BUDGET_HEADS, required: true },
        { key: "description", label: "Description", type: "text" },
        { key: "quantity", label: "Quantity", type: "number", required: true, min: 1 },
        { key: "unit", label: "Unit", type: "select", options: DEFAULT_BUDGET_UNITS, required: true },
        { key: "rate", label: "Rate (INR)", type: "number", required: true, min: 0 },
        { key: "estimated_amount", label: "Estimated Amount (INR)", type: "number", calculated: true, formula: "quantity * rate" }
      ]
    }
  ]
};

/**
 * Initial Seed Data for immediate interactive administration preview
 */
export const INITIAL_PROGRAMS = [
  {
    id: 1,
    program_id: "VP-2025-001",
    program_name: "Green Canopy & Eco Restoration Drive",
    csr_theme: "Environment & Sustainability",
    financial_year: "2024-2025",
    objective: "To mobilize corporate volunteers for extensive urban afforestation, mangrove cleanup, and pond restoration across key city locations.",
    target_employees: 350,
    target_events: 12,
    target_volunteer_hours: 1400,
    target_beneficiaries: 15000,
    overall_budget: 850000,
    program_manager: "Ananya Sharma",
    start_date: "2024-04-01",
    end_date: "2025-03-31",
    status: "Active",
    achieved_events: 5,
    achieved_employees: 180,
    achieved_hours: 720
  },
  {
    id: 2,
    program_id: "VP-2025-002",
    program_name: "STEM & Digital Literacy in Rural Schools",
    csr_theme: "Education & Literacy",
    financial_year: "2024-2025",
    objective: "Employee-led mentoring and weekend workshops in government schools to enhance digital skills and science learning.",
    target_employees: 200,
    target_events: 8,
    target_volunteer_hours: 800,
    target_beneficiaries: 3000,
    overall_budget: 450000,
    program_manager: "Vikram Malhotra",
    start_date: "2024-06-01",
    end_date: "2025-03-31",
    status: "Active",
    achieved_events: 3,
    achieved_employees: 95,
    achieved_hours: 380
  },
  {
    id: 3,
    program_id: "VP-2025-003",
    program_name: "Community Health & Nutrition Outreach",
    csr_theme: "Healthcare & Nutrition",
    financial_year: "2024-2025",
    objective: "Organizing periodic health screening camps, blood donation drives, and adolescent nutrition counseling.",
    target_employees: 150,
    target_events: 6,
    target_volunteer_hours: 600,
    target_beneficiaries: 5000,
    overall_budget: 600000,
    program_manager: "Dr. Radhika Sen",
    start_date: "2024-05-15",
    end_date: "2025-02-28",
    status: "Active",
    achieved_events: 2,
    achieved_employees: 70,
    achieved_hours: 280
  }
];

export const INITIAL_EVENTS = [
  {
    id: 101,
    event_id: "EVT-2025-001",
    event_name: "Mangrove Cleanup & Sapling Plantation",
    program_id: "VP-2025-001",
    program_name: "Green Canopy & Eco Restoration Drive",
    csr_theme: "Environment & Sustainability",
    event_type: "Tree plantation",
    objective: "Plant 500 indigenous mangrove saplings and clear plastic waste along the coastal belt.",
    event_date: "2025-03-22",
    start_time: "07:30 AM",
    end_time: "11:30 AM",
    registration_deadline: "2025-03-20 06:00 PM",
    max_volunteers: 45,
    min_volunteers: 20,
    registered_count: 38,
    attended_count: 36,
    target_employee_groups: ["All Employees"],
    implementing_ngo: "Green Earth Foundation",
    event_coordinator: "Rahul Varma",
    contact_person: "Rahul Varma (+91 9876543210)",
    event_location: "Mahim Nature Park & Coastal Strip, Mumbai",
    lat_lon: "19.0448, 72.8550",
    meeting_point: "Gate 1 Main Entry",
    distance_from_office: 8.5,
    address: "Bandra-Sion Link Road, Dharavi, Mumbai, Maharashtra 400017",
    detailed_objectives: "1. 500 mangrove saplings planted.\n2. 200kg plastic collected and sent for recycling.\n3. Awareness talk by environmental botanist.",
    budget_items: [
      { id: "b1", budget_head: "Materials & Plantation Kits", description: "500 saplings with protective cages & organic manure", quantity: 500, unit: "Units", rate: 60, estimated_amount: 30000 },
      { id: "b2", budget_head: "Logistics & Transport", description: "AC Bus for volunteer pickup from main office", quantity: 1, unit: "Trips", rate: 12000, estimated_amount: 12000 },
      { id: "b3", budget_head: "Refreshments & Water", description: "Healthy breakfast boxes & electrolyte water dispensers", quantity: 50, unit: "Persons", rate: 180, estimated_amount: 9000 },
      { id: "b4", budget_head: "Safety & First Aid", description: "Heavy duty gloves, gumboots & emergency medical kit", quantity: 50, unit: "Units", rate: 80, estimated_amount: 4000 }
    ],
    total_budget: 55000,
    approval_status: "APPROVED",
    approval_history: [
      { step: "Created", user: "Rahul Varma", role: "Event Coordinator", date: "2025-03-01 10:00 AM", status: "Submitted", comments: "Event proposal submitted for review." },
      { step: "Program Manager Review", user: "Ananya Sharma", role: "Program Manager", date: "2025-03-02 02:30 PM", status: "Approved", comments: "Aligned with FY Green Canopy target." },
      { step: "CSR Head Approval", user: "Suresh Menon", role: "Head of CSR", date: "2025-03-03 11:15 AM", status: "Approved", comments: "Budget allocated and approved." }
    ],
    volunteers: [
      { id: "v1", emp_id: "EMP0142", name: "Priya Nair", email: "priya.nair@company.com", dept: "Tech", status: "Attended", check_in: "07:35 AM", check_out: "11:35 AM", hours: 4.0 },
      { id: "v2", emp_id: "EMP0209", name: "Amit Joshi", email: "amit.joshi@company.com", dept: "Marketing", status: "Attended", check_in: "07:40 AM", check_out: "11:30 AM", hours: 4.0 },
      { id: "v3", emp_id: "EMP0311", name: "Sanya Roy", email: "sanya.roy@company.com", dept: "HR", status: "Registered", check_in: null, check_out: null, hours: 0 }
    ],
    media: [
      { id: "m1", type: "photo", url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop", caption: "Volunteers planting mangrove saplings", author: "Priya Nair" },
      { id: "m2", type: "photo", url: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600&auto=format&fit=crop", caption: "Team group photo at Mahim Nature Park", author: "Rahul Varma" }
    ],
    closure_summary: {
      status: "Open",
      actual_beneficiaries: 1200,
      actual_hours_logged: 144,
      key_learnings: "High employee enthusiasm; recommended to schedule next event earlier in the morning due to sun.",
      rating: 4.8
    }
  },
  {
    id: 102,
    event_id: "EVT-2025-002",
    event_name: "Weekend Robotics & AI Workshop for High Schoolers",
    program_id: "VP-2025-002",
    program_name: "STEM & Digital Literacy in Rural Schools",
    csr_theme: "Education & Literacy",
    event_type: "School volunteering",
    objective: "Conduct hands-on coding and science experiments for 120 students in grades 8-10.",
    event_date: "2025-03-29",
    start_time: "09:00 AM",
    end_time: "02:00 PM",
    registration_deadline: "2025-03-27 12:00 PM",
    max_volunteers: 25,
    min_volunteers: 10,
    registered_count: 22,
    attended_count: 0,
    target_employee_groups: ["Engineering & Tech", "Product"],
    implementing_ngo: "Pratham Shiksha Trust",
    event_coordinator: "Neha Deshmukh",
    contact_person: "Neha Deshmukh (+91 9820112233)",
    event_location: "Zilla Parishad High School, Thane West",
    lat_lon: "19.2183, 72.9781",
    meeting_point: "School Auditorium",
    distance_from_office: 22.0,
    address: "Near Old Talao, Station Road, Thane West 400601",
    detailed_objectives: "1. 120 students trained in introductory robotics.\n2. Hands-on coding kits distributed.\n3. Career counseling session.",
    budget_items: [
      { id: "b1", budget_head: "Materials & Plantation Kits", description: "Hands-on Arduino/Robotics Student Kits (12 kits)", quantity: 12, unit: "Kits", rate: 2500, estimated_amount: 30000 },
      { id: "b2", budget_head: "Refreshments & Water", description: "Lunch for volunteers and students", quantity: 150, unit: "Persons", rate: 120, estimated_amount: 18000 },
      { id: "b3", budget_head: "Logistics & Transport", description: "Transport van for equipment & mentors", quantity: 1, unit: "Trips", rate: 8000, estimated_amount: 8000 }
    ],
    total_budget: 56000,
    approval_status: "PENDING_CSR_HEAD",
    approval_history: [
      { step: "Created", user: "Neha Deshmukh", role: "Coordinator", date: "2025-03-10 11:00 AM", status: "Submitted", comments: "Submitted for approval." },
      { step: "Program Manager Review", user: "Vikram Malhotra", role: "Program Manager", date: "2025-03-11 04:00 PM", status: "Approved", comments: "Verified school permission & schedule." }
    ],
    volunteers: [],
    media: []
  },
  {
    id: 103,
    event_id: "EVT-2025-003",
    event_name: "Community Health Screening & Blood Donation Camp",
    program_id: "VP-2025-003",
    program_name: "Community Health & Nutrition Outreach",
    csr_theme: "Healthcare & Nutrition",
    event_type: "Health camp",
    objective: "Provide free diagnostic tests, general physician consultations, and blood donation facility for local slum settlement residents.",
    event_date: "2025-04-05",
    start_time: "08:30 AM",
    end_time: "03:30 PM",
    registration_deadline: "2025-04-03 05:00 PM",
    max_volunteers: 35,
    min_volunteers: 15,
    registered_count: 18,
    attended_count: 0,
    target_employee_groups: ["All Employees"],
    implementing_ngo: "Rotary Health Alliance",
    event_coordinator: "Siddharth Das",
    contact_person: "Siddharth Das (+91 9711223344)",
    event_location: "Community Hall, Kurla East",
    lat_lon: "19.0657, 72.8794",
    meeting_point: "Community Hall Reception",
    distance_from_office: 6.0,
    address: "Nehru Nagar, Kurla East, Mumbai 400024",
    detailed_objectives: "1. 400 residents screened for diabetes and hypertension.\n2. 75 blood units collected.\n3. Nutrition supplement kits provided to 150 mothers.",
    budget_items: [
      { id: "b1", budget_head: "Trainer / Expert Honorarium", description: "Honorarium for 3 visiting doctors & 4 lab technicians", quantity: 7, unit: "Persons", rate: 3000, estimated_amount: 21000 },
      { id: "b2", budget_head: "Safety & First Aid", description: "Medical testing strips, needles, sanitizers, gloves", quantity: 1, unit: "Lump sum", rate: 25000, estimated_amount: 25000 },
      { id: "b3", budget_head: "Refreshments & Water", description: "High-protein snacks and juice for blood donors", quantity: 100, unit: "Persons", rate: 150, estimated_amount: 15000 }
    ],
    total_budget: 61000,
    approval_status: "DRAFT",
    approval_history: [
      { step: "Created", user: "Siddharth Das", role: "Coordinator", date: "2025-03-14 03:00 PM", status: "Draft", comments: "Drafting venue and doctor schedule." }
    ],
    volunteers: []
  }
];

export const ALL_COMPANY_EMPLOYEES = [
  {
    id: "v1",
    emp_id: "EMP-1042",
    name: "Rahul Sharma",
    email: "rahul.sharma@techcsr.com",
    dept: "Engineering",
    phone: "+91 98201 10042",
    status: "Attended",
    check_in: "08:15 AM",
    check_out: "01:00 PM",
    hours: 4.5,
    photos: [
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=600&auto=format&fit=crop&q=60"
    ],
    documents: [
      { tdoc_id: "doc_101", file_name: "blood_donor_logsheet_verified.pdf", file_path: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", doc_type: "pdf", doc_purpose: "Volunteer On-ground Proof" },
      { tdoc_id: "doc_102", file_name: "coordinator_signoff_stamp.png", file_path: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=60", doc_type: "image", doc_purpose: "Signed Register" }
    ],
    feedback_form: {
      hours: 4.5,
      rating: 5,
      learnings: "Coordinated blood donor registrations and assisted 45 elderly residents during health screening.",
      testimonial: "Incredible experience directly making an impact in Kurla East community!",
      submitted_at: "2025-04-05 04:15 PM",
      verification_status: "Pending Review",
      admin_notes: "",
      photos: [
        "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=60",
        "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=600&auto=format&fit=crop&q=60"
      ],
      attachments: [
        { name: "blood_donor_logsheet_verified.pdf", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", type: "pdf" }
      ]
    }
  },
  {
    id: "v2",
    emp_id: "EMP-1088",
    name: "Priya Patel",
    email: "priya.patel@techcsr.com",
    dept: "Marketing",
    phone: "+91 98201 10088",
    status: "Attended",
    check_in: "08:25 AM",
    check_out: "12:45 PM",
    hours: 4.0,
    photos: [
      "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600&auto=format&fit=crop&q=60"
    ],
    documents: [
      { tdoc_id: "doc_103", file_name: "nutrition_kit_distribution_signoff.pdf", file_path: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", doc_type: "pdf", doc_purpose: "Distribution Sign-off" }
    ],
    feedback_form: {
      hours: 4.0,
      rating: 5,
      learnings: "Managed distribution of nutrition kits to 60 mothers and children, verified ration stamps.",
      testimonial: "Seeing smiles on children receiving nutrition supplements was priceless.",
      submitted_at: "2025-04-05 04:30 PM",
      verification_status: "Approved",
      admin_notes: "Verified attendance sheet with NGO coordinator.",
      photos: [
        "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600&auto=format&fit=crop&q=60"
      ],
      attachments: [
        { name: "nutrition_kit_distribution_signoff.pdf", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", type: "pdf" }
      ]
    }
  },
  {
    id: "v3",
    emp_id: "EMP-2015",
    name: "Amit Verma",
    email: "amit.verma@techcsr.com",
    dept: "Operations",
    phone: "+91 98201 20015",
    status: "Attended",
    check_in: "08:45 AM",
    check_out: "12:15 PM",
    hours: 3.5,
    photos: [
      "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600&auto=format&fit=crop&q=60"
    ],
    documents: [
      { tdoc_id: "doc_104", file_name: "attendance_verification_slip.jpg", file_path: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600&auto=format&fit=crop&q=60", doc_type: "image", doc_purpose: "Attendance Proof" }
    ],
    feedback_form: {
      hours: 3.5,
      rating: 4,
      learnings: "Assisted doctors with crowd control and queue management in triage section.",
      testimonial: "Very well organized event by CSR team. Hope to join again next quarter.",
      submitted_at: "2025-04-05 05:10 PM",
      verification_status: "Pending Review",
      admin_notes: "",
      photos: [
        "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600&auto=format&fit=crop&q=60"
      ],
      attachments: []
    }
  },
  {
    id: "v4",
    emp_id: "EMP-3041",
    name: "Sneha Reddy",
    email: "sneha.reddy@techcsr.com",
    dept: "Finance",
    phone: "+91 98201 30041",
    status: "Accepted",
    check_in: null,
    hours: 0,
    feedback_form: null
  },
  {
    id: "v5",
    emp_id: "EMP-4102",
    name: "Kunal Joshi",
    email: "kunal.joshi@techcsr.com",
    dept: "HR & CSR",
    phone: "+91 98201 40102",
    status: "Accepted",
    check_in: null,
    hours: 0,
    feedback_form: null
  },
  {
    id: "v6",
    emp_id: "EMP-5012",
    name: "Ananya Deshpande",
    email: "ananya.d@techcsr.com",
    dept: "Design",
    phone: "+91 98201 50012",
    status: "Invited",
    check_in: null,
    hours: 0,
    feedback_form: null
  },
  {
    id: "v7",
    emp_id: "EMP-6119",
    name: "Vikram Malhotra",
    email: "vikram.m@techcsr.com",
    dept: "Product Management",
    phone: "+91 98201 60119",
    status: "Invited",
    check_in: null,
    hours: 0,
    feedback_form: null
  },
  {
    id: "v8",
    emp_id: "EMP-7230",
    name: "Ritu Kapoor",
    email: "ritu.k@techcsr.com",
    dept: "Legal & Compliance",
    phone: "+91 98201 70230",
    status: "Rejected",
    check_in: null,
    hours: 0,
    feedback_form: null
  }
];

