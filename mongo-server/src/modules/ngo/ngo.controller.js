const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../../models/User.model');
const Role = require('../../models/Role.model');
const NgoDueDiligenceVersion = require('../../models/NgoDueDiligenceVersion.model');
const Notification = require('../../models/Notification.model');
const { getFormCollection } = require('../../utils/formCollection.util');

const extractUser = (req) => {
  const u = req.user || {};
  return {
    userId: u.userId || u.id || u._id || null,
    email: u.email || '',
    name: u.name || u.full_name || '',
    role: u.role || 'user'
  };
};

// 0. NGO Registrations Listing & Manager Status Update
exports.getNgoRegistrations = async (req, res) => {
  try {
    const { Model } = await getFormCollection('implementation_partner');
    const { status, search } = req.query;

    const filter = {};
    if (status) {
      filter.$or = [{ status }, { 'data.status': status }];
    }
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { 'data.organization_name': regex },
        { 'data.ngo_name': regex },
        { 'data.email': regex },
        { 'data.registration_number': regex }
      ];
    }

    const items = await Model.find(filter).sort({ createdAt: -1 }).lean();
    const data = items.map(doc => {
      const flat = { ...doc, ...(doc.data || {}) };
      return { ...flat, id: doc._id.toString(), _id: doc._id.toString() };
    });

    res.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error('getNgoRegistrations Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNgoRegistrationDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const { Model } = await getFormCollection('implementation_partner');

    let doc = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      doc = await Model.findById(id).lean();
    }
    if (!doc) {
      doc = await Model.findOne({ $or: [{ id }, { 'data.id': id }] }).lean();
    }
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    const flat = { ...doc, ...(doc.data || {}) };
    res.json({ success: true, data: { ...flat, id: doc._id.toString() } });
  } catch (error) {
    console.error('getNgoRegistrationDetail Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateRegistrationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const { Model } = await getFormCollection('implementation_partner');

    const updated = await Model.findByIdAndUpdate(
      id,
      {
        $set: {
          status,
          'data.status': status,
          'data.remarks': remarks || ''
        }
      },
      { new: true }
    );

    res.json({ success: true, message: 'Status updated successfully', data: updated });
  } catch (error) {
    console.error('updateRegistrationStatus Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 0.1 NGO Profile & Due Diligence Status for Logged-In User
exports.getNgoProfileStatus = async (req, res) => {
  try {
    const user = extractUser(req);
    const { Model: PartnerModel } = await getFormCollection('implementation_partner');
    const { Model: DdModel } = await getFormCollection('ngo_due_diligence');

    const partner = await PartnerModel.findOne({
      $or: [
        { 'data.email': user.email },
        { 'data.contact_email': user.email },
        { created_by: user.userId },
        { user_id: user.userId }
      ]
    }).lean();

    const partnerId = partner?._id?.toString() || user.userId;
    const dueDiligence = await DdModel.findOne({
      $or: [
        { partner_id: partnerId },
        { 'data.partner_id': partnerId },
        { created_by: user.userId }
      ]
    }).sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      data: {
        profile_complete: !!partner,
        partner_data: partner ? { ...partner, ...(partner.data || {}), id: partner._id.toString() } : null,
        due_diligence_submitted: !!dueDiligence,
        due_diligence_status: dueDiligence ? (dueDiligence.status || dueDiligence.data?.status || 'Submitted') : 'Not Started',
        due_diligence_data: dueDiligence ? { ...dueDiligence, ...(dueDiligence.data || {}), id: dueDiligence._id.toString() } : null
      }
    });
  } catch (error) {
    console.error('getNgoProfileStatus Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 0.2 Dedicated Profile API
exports.getNgoProfile = async (req, res) => {
  try {
    const user = extractUser(req);
    const { Model } = await getFormCollection('implementation_partner');

    const partner = await Model.findOne({
      $or: [
        { 'data.email': user.email },
        { 'data.contact_email': user.email },
        { created_by: user.userId },
        { user_id: user.userId }
      ]
    }).lean();

    if (!partner) {
      return res.json({ success: true, data: null });
    }

    const flat = { ...partner, ...(partner.data || {}) };
    res.json({ success: true, data: { ...flat, id: partner._id.toString() } });
  } catch (error) {
    console.error('getNgoProfile Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.saveNgoProfile = async (req, res) => {
  try {
    const user = extractUser(req);
    const { Model } = await getFormCollection('implementation_partner');
    const body = req.body || {};

    const partnerData = {
      ...body,
      user_id: user.userId,
      contact_email: body.email || user.email
    };

    const doc = await Model.findOneAndUpdate(
      {
        $or: [
          { 'data.email': user.email },
          { created_by: user.userId },
          { user_id: user.userId }
        ]
      },
      {
        $set: {
          data: partnerData,
          status: body.status || 'Active',
          user_id: user.userId,
          created_by: user.userId
        }
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: 'NGO profile saved successfully',
      data: { ...partnerData, id: doc._id.toString() }
    });
  } catch (error) {
    console.error('saveNgoProfile Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 0.3 Dedicated Versioned Due Diligence API
exports.getNgoDueDiligence = async (req, res) => {
  try {
    const user = extractUser(req);
    const { Model } = await getFormCollection('ngo_due_diligence');

    const doc = await Model.findOne({
      $or: [
        { created_by: user.userId },
        { user_id: user.userId },
        { 'data.email': user.email }
      ]
    }).sort({ createdAt: -1 }).lean();

    if (!doc) {
      return res.json({ success: true, data: null });
    }

    const flat = { ...doc, ...(doc.data || {}) };
    res.json({ success: true, data: { ...flat, id: doc._id.toString() } });
  } catch (error) {
    console.error('getNgoDueDiligence Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.saveNgoDueDiligence = async (req, res) => {
  try {
    const user = extractUser(req);
    const { Model: DdModel } = await getFormCollection('ngo_due_diligence');
    const { Model: PartnerModel } = await getFormCollection('implementation_partner');
    const body = req.body || {};

    const partner = await PartnerModel.findOne({
      $or: [
        { 'data.email': user.email },
        { created_by: user.userId },
        { user_id: user.userId }
      ]
    }).lean();

    const partnerId = partner?._id?.toString() || user.userId;
    const partnerName = partner?.data?.organization_name || partner?.data?.ngo_name || user.name || 'NGO Partner';

    // Get current version count for this NGO
    const prevVersionCount = await NgoDueDiligenceVersion.countDocuments({ ngo_id: partnerId });
    const newVersion = prevVersionCount + 1;

    // Save/update active due diligence record
    const ddDoc = await DdModel.findOneAndUpdate(
      {
        $or: [
          { partner_id: partnerId },
          { 'data.partner_id': partnerId },
          { created_by: user.userId }
        ]
      },
      {
        $set: {
          partner_id: partnerId,
          version: newVersion,
          status: body.status || 'Submitted',
          data: { ...body, partner_id: partnerId, version: newVersion },
          created_by: user.userId
        }
      },
      { new: true, upsert: true }
    );

    // Create version snapshot in NgoDueDiligenceVersion
    await NgoDueDiligenceVersion.create({
      ngo_id: partnerId,
      ngo_name: partnerName,
      version_number: newVersion,
      status: body.status || 'Submitted',
      form_data: body,
      documents: body.documents || [],
      submitted_by: user.userId,
      submitted_at: new Date()
    });

    res.json({
      success: true,
      message: `Due diligence version v${newVersion} submitted successfully`,
      data: { ...body, version: newVersion, id: ddDoc._id.toString() }
    });
  } catch (error) {
    console.error('saveNgoDueDiligence Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNgoDueDiligenceVersions = async (req, res) => {
  try {
    const user = extractUser(req);
    const { partner_id } = req.query;
    const ngoId = partner_id || user.userId;

    const versions = await NgoDueDiligenceVersion.find({
      $or: [{ ngo_id: ngoId }, { submitted_by: user.userId }]
    }).sort({ version_number: -1 }).lean();

    res.json({
      success: true,
      data: versions.map(v => ({ ...v, id: v._id.toString() })),
      count: versions.length
    });
  } catch (error) {
    console.error('getNgoDueDiligenceVersions Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNgoDueDiligenceVersionDetail = async (req, res) => {
  try {
    const { version } = req.params;
    const user = extractUser(req);

    const doc = await NgoDueDiligenceVersion.findOne({
      version_number: Number(version),
      $or: [{ submitted_by: user.userId }, { ngo_id: user.userId }]
    }).lean();

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Due diligence version not found' });
    }

    res.json({ success: true, data: { ...doc, id: doc._id.toString() } });
  } catch (error) {
    console.error('getNgoDueDiligenceVersionDetail Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 0.4 Dedicated NGO Projects Listing API
exports.getNgoProjects = async (req, res) => {
  try {
    const user = extractUser(req);
    const { Model } = await getFormCollection('project');

    const projects = await Model.find({
      $or: [
        { 'data.partner_id': user.userId },
        { 'data.ngo_email': user.email },
        { created_by: user.userId }
      ]
    }).sort({ createdAt: -1 }).lean();

    const data = projects.map(p => ({ ...p, ...(p.data || {}), id: p._id.toString() }));
    res.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error('getNgoProjects Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 1. Admin / Manager Approve Implementation Partner & Auto-Create User Account
exports.approvePartner = async (req, res) => {
  try {
    const { partner_id, remarks } = req.body;
    const { Model } = await getFormCollection('implementation_partner');

    const partner = await Model.findById(partner_id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Partner record not found' });
    }

    const partnerData = partner.data || {};
    const email = partnerData.email || partnerData.contact_email;
    const name = partnerData.organization_name || partnerData.ngo_name || 'NGO Representative';

    if (!email) {
      return res.status(400).json({ success: false, message: 'Partner record does not have a valid email address' });
    }

    // Find or create 'ngo' role
    let ngoRole = await Role.findOne({ name: { $regex: /^ngo$/i } });
    if (!ngoRole) {
      ngoRole = await Role.create({
        name: 'ngo',
        description: 'NGO Implementation Partner Role',
        is_active: true
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email: email.toLowerCase() });
    let isNewUser = false;

    if (!user) {
      const hashedPassword = await bcrypt.hash('Default@123', 10);
      user = await User.create({
        email: email.toLowerCase(),
        name,
        password: hashedPassword,
        role: 'ngo',
        role_id: ngoRole._id,
        is_active: true
      });
      isNewUser = true;
    }

    // Update partner record
    partner.status = 'Approved';
    if (!partner.data) partner.data = {};
    partner.data.status = 'Approved';
    partner.data.approved_at = new Date();
    partner.data.user_id = user._id.toString();
    partner.data.approval_remarks = remarks || '';
    partner.markModified('data');
    await partner.save();

    res.json({
      success: true,
      message: `Partner approved successfully. ${isNewUser ? 'User account created with initial password Default@123' : 'User account already existed.'}`,
      data: {
        partner_id,
        user_id: user._id.toString(),
        email: user.email,
        temporary_password: isNewUser ? 'Default@123' : undefined
      }
    });
  } catch (error) {
    console.error('approvePartner Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Fetch Approved NGOs for Admin Float RFP Dropdown
exports.getApprovedNgos = async (req, res) => {
  try {
    const { Model } = await getFormCollection('implementation_partner');

    const ngos = await Model.find({
      $or: [
        { status: { $in: ['Approved', 'approved', 'Active', 'active'] } },
        { 'data.status': { $in: ['Approved', 'approved', 'Active', 'active'] } }
      ]
    }).lean();

    const list = ngos.map(n => {
      const flat = { ...n, ...(n.data || {}) };
      return {
        id: n._id.toString(),
        organization_name: flat.organization_name || flat.ngo_name || 'Unnamed NGO',
        email: flat.email || flat.contact_email || '',
        registration_number: flat.registration_number || '',
        state: flat.state || '',
        thematic_areas: flat.thematic_areas || []
      };
    });

    res.json({ success: true, data: list, count: list.length });
  } catch (error) {
    console.error('getApprovedNgos Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Fetch Master Evaluation Criteria
exports.getMasterCriteria = async (req, res) => {
  try {
    const { Model } = await getFormCollection('criteria');
    const criteria = await Model.find({}).sort({ 'data.display_order': 1, createdAt: 1 }).lean();

    const list = criteria.map(c => {
      const flat = { ...c, ...(c.data || {}) };
      return {
        id: c._id.toString(),
        criteria_name: flat.criteria_name || flat.name || 'Criteria',
        max_score: Number(flat.max_score) || 10,
        weightage: Number(flat.weightage) || 1,
        category: flat.category || 'General'
      };
    });

    res.json({ success: true, data: list });
  } catch (error) {
    console.error('getMasterCriteria Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Float RFP to Selected NGOs
exports.floatRfp = async (req, res) => {
  try {
    const user = extractUser(req);
    const { rfp_id, ngo_ids, deadline, notes } = req.body;
    const { Model: RfpModel } = await getFormCollection('rfp');

    const rfp = await RfpModel.findById(rfp_id);
    if (!rfp) {
      return res.status(404).json({ success: false, message: 'RFP not found' });
    }

    if (!rfp.data) rfp.data = {};
    rfp.data.floated_ngos = ngo_ids || [];
    rfp.data.floated_at = new Date();
    rfp.data.float_deadline = deadline || rfp.data.submission_deadline;
    rfp.data.float_notes = notes || '';
    rfp.data.status = 'Floated';
    rfp.status = 'Floated';
    rfp.markModified('data');
    await rfp.save();

    // Create notifications for selected NGOs
    if (Array.isArray(ngo_ids)) {
      for (const ngoId of ngo_ids) {
        await Notification.create({
          user_id: ngoId,
          title: 'New RFP Opportunity Floated',
          message: `You have been invited to submit a proposal for "${rfp.data.rfp_title || 'CSR RFP'}"`,
          type: 'rfp',
          action_url: `/ngo/rfp-opportunities`
        }).catch(() => {});
      }
    }

    res.json({ success: true, message: `RFP successfully floated to ${ngo_ids?.length || 0} NGOs`, data: rfp });
  } catch (error) {
    console.error('floatRfp Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. RFP Opportunities for NGO
exports.getOpenRfps = async (req, res) => {
  try {
    const user = extractUser(req);
    const { Model: RfpModel } = await getFormCollection('rfp');

    const rfps = await RfpModel.find({
      $or: [
        { status: { $in: ['Floated', 'Active', 'Open', 'floated', 'active', 'open'] } },
        { 'data.status': { $in: ['Floated', 'Active', 'Open', 'floated', 'active', 'open'] } }
      ]
    }).sort({ createdAt: -1 }).lean();

    const data = rfps.map(r => ({ ...r, ...(r.data || {}), id: r._id.toString() }));
    res.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error('getOpenRfps Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getClosedRfps = async (req, res) => {
  try {
    const { Model: RfpModel } = await getFormCollection('rfp');

    const rfps = await RfpModel.find({
      $or: [
        { status: { $in: ['Closed', 'Evaluated', 'Completed', 'closed'] } },
        { 'data.status': { $in: ['Closed', 'Evaluated', 'Completed', 'closed'] } }
      ]
    }).sort({ createdAt: -1 }).lean();

    const data = rfps.map(r => ({ ...r, ...(r.data || {}), id: r._id.toString() }));
    res.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error('getClosedRfps Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRfpOpportunities = async (req, res) => {
  try {
    const user = extractUser(req);
    const { Model: RfpModel } = await getFormCollection('rfp');
    const { Model: ProposalModel } = await getFormCollection('rfp_proposal');

    const rfps = await RfpModel.find({}).sort({ createdAt: -1 }).lean();

    const list = await Promise.all(rfps.map(async (rfp) => {
      const rfpId = rfp._id.toString();
      const flat = { ...rfp, ...(rfp.data || {}) };

      const myProposal = await ProposalModel.findOne({
        $or: [{ rfp_id: rfpId }, { 'data.rfp_id': rfpId }],
        $or: [{ created_by: user.userId }, { 'data.submitted_by': user.userId }]
      }).lean();

      return {
        ...flat,
        id: rfpId,
        has_submitted: !!myProposal,
        proposal_status: myProposal ? (myProposal.status || myProposal.data?.status || 'Submitted') : null,
        proposal_id: myProposal ? myProposal._id.toString() : null
      };
    }));

    res.json({ success: true, data: list, count: list.length });
  } catch (error) {
    console.error('getRfpOpportunities Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Admin NGO Evaluation & Rating Submission
exports.saveNgoEvaluation = async (req, res) => {
  try {
    const user = extractUser(req);
    const { rfp_id, ngo_id, proposal_id, scores, overall_rating, feedback } = req.body;
    const { Model: EvalModel } = await getFormCollection('rfp_evaluation');

    const evalData = {
      rfp_id,
      ngo_id,
      proposal_id,
      scores: scores || [],
      overall_rating: Number(overall_rating) || 0,
      feedback: feedback || '',
      evaluated_by: user.userId,
      evaluated_at: new Date()
    };

    const doc = await EvalModel.create({
      rfp_id,
      data: evalData,
      status: 'Evaluated',
      created_by: user.userId
    });

    res.status(201).json({
      success: true,
      message: 'NGO evaluation submitted successfully',
      data: { ...evalData, id: doc._id.toString() }
    });
  } catch (error) {
    console.error('saveNgoEvaluation Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. NGO Submit Floated RFP Proposal
exports.submitRfpProposal = async (req, res) => {
  try {
    const user = extractUser(req);
    const body = req.body || {};
    const { Model: ProposalModel } = await getFormCollection('rfp_proposal');

    const proposalData = {
      ...body,
      submitted_by: user.userId,
      submitted_by_name: user.name,
      submitted_by_email: user.email,
      submitted_at: new Date(),
      status: 'Submitted'
    };

    const doc = await ProposalModel.create({
      rfp_id: body.rfp_id,
      data: proposalData,
      status: 'Submitted',
      created_by: user.userId
    });

    res.status(201).json({
      success: true,
      message: 'Proposal submitted successfully',
      data: { ...proposalData, id: doc._id.toString() }
    });
  } catch (error) {
    console.error('submitRfpProposal Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyProposal = async (req, res) => {
  try {
    const user = extractUser(req);
    const rfpId = req.params.rfpId || req.query.rfp_id;
    const { Model: ProposalModel } = await getFormCollection('rfp_proposal');

    const filter = {
      $or: [{ created_by: user.userId }, { 'data.submitted_by': user.userId }]
    };
    if (rfpId) {
      filter.$and = [{ $or: [{ rfp_id: rfpId }, { 'data.rfp_id': rfpId }] }];
    }

    const proposal = await ProposalModel.findOne(filter).sort({ createdAt: -1 }).lean();
    if (!proposal) {
      return res.json({ success: true, data: null });
    }

    const flat = { ...proposal, ...(proposal.data || {}) };
    res.json({ success: true, data: { ...flat, id: proposal._id.toString() } });
  } catch (error) {
    console.error('getMyProposal Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 8. Admin: Get all submitted proposals for an RFP
exports.getSubmittedProposals = async (req, res) => {
  try {
    const { rfp_id } = req.query;
    const { Model: ProposalModel } = await getFormCollection('rfp_proposal');

    const filter = {};
    if (rfp_id) {
      filter.$or = [{ rfp_id }, { 'data.rfp_id': rfp_id }];
    }

    const proposals = await ProposalModel.find(filter).sort({ createdAt: -1 }).lean();
    const data = proposals.map(p => ({ ...p, ...(p.data || {}), id: p._id.toString() }));

    res.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error('getSubmittedProposals Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 9. Admin: Save criteria-wise scores for a proposal
exports.saveCriteriaScore = async (req, res) => {
  try {
    const user = extractUser(req);
    const { proposal_id, criteria_scores, total_score, remarks } = req.body;
    const { Model: ProposalModel } = await getFormCollection('rfp_proposal');

    const proposal = await ProposalModel.findById(proposal_id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    if (!proposal.data) proposal.data = {};
    proposal.data.criteria_scores = criteria_scores || [];
    proposal.data.total_score = total_score || 0;
    proposal.data.scoring_remarks = remarks || '';
    proposal.data.scored_by = user.userId;
    proposal.data.scored_at = new Date();
    proposal.markModified('data');
    await proposal.save();

    res.json({ success: true, message: 'Scores saved successfully', data: proposal });
  } catch (error) {
    console.error('saveCriteriaScore Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 10. Admin / Approver: Tag selected NGO partner for RFP
exports.selectPartner = async (req, res) => {
  try {
    const user = extractUser(req);
    const { rfp_id, selected_ngo_id, selected_proposal_id, notes } = req.body;
    const { Model: RfpModel } = await getFormCollection('rfp');

    const rfp = await RfpModel.findById(rfp_id);
    if (!rfp) {
      return res.status(404).json({ success: false, message: 'RFP not found' });
    }

    if (!rfp.data) rfp.data = {};
    rfp.data.selected_ngo_id = selected_ngo_id;
    rfp.data.selected_proposal_id = selected_proposal_id;
    rfp.data.selection_notes = notes || '';
    rfp.data.status = 'Awarded';
    rfp.status = 'Awarded';
    rfp.markModified('data');
    await rfp.save();

    res.json({ success: true, message: 'Partner awarded RFP successfully', data: rfp });
  } catch (error) {
    console.error('selectPartner Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 11. Admin / Approver: Get approval track timeline for RFP
exports.getApprovalTrack = async (req, res) => {
  try {
    const { rfp_id } = req.query;
    const { Model: RfpModel } = await getFormCollection('rfp');

    const rfp = await RfpModel.findById(rfp_id).lean();
    if (!rfp) {
      return res.status(404).json({ success: false, message: 'RFP not found' });
    }

    const flat = { ...rfp, ...(rfp.data || {}) };
    const timeline = [
      { step: 'Created', timestamp: rfp.createdAt, status: 'completed' },
      { step: 'Floated', timestamp: flat.floated_at || null, status: flat.floated_at ? 'completed' : 'pending' },
      { step: 'Awarded', timestamp: flat.status === 'Awarded' ? rfp.updatedAt : null, status: flat.status === 'Awarded' ? 'completed' : 'pending' }
    ];

    res.json({ success: true, data: timeline });
  } catch (error) {
    console.error('getApprovalTrack Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
