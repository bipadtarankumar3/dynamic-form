// mongo-server/src/modules/public/public.controller.js
const Form = require('../../models/Form.model');
const User = require('../../models/User.model');
const Otp = require('../../models/Otp.model');
const Role = require('../../models/Role.model');
const Setting = require('../../models/Setting.model');
const { getFormModel } = require('../../utils/formCollection.util');
const dynamicFormCtrl = require('../dynamic-form/dynamicForm.controller');
const bcrypt = require('bcryptjs');
const { sign } = require('jsonwebtoken');

const publicController = {
  // Public schema details
  schemaDetails: dynamicFormCtrl.schemaDetails,
  getPublicFormMeta: dynamicFormCtrl.schemaDetails,

  // Public master details
  masterDetails: dynamicFormCtrl.masterDetails,

  // Public form submission
  submitForm: dynamicFormCtrl.add,
  submitPublicForm: dynamicFormCtrl.add,

  // NGO Registration with OTP
  ngoRegistration: async (req, res) => {
    try {
      const { organization_name, darpan_no, email, phone_no, person_name, password } = req.body;
      if (!email || !organization_name) {
        return res.status(400).json({ success: false, message: 'Organization name and email are required' });
      }

      const existingUser = await User.findOne({ email: email.toLowerCase(), deleted_at: null });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'User with this email already registered' });
      }

      let ngoRole = await Role.findOne({ slug: 'ngo', deleted_at: null });
      if (!ngoRole) {
        ngoRole = await Role.findOne({ slug: 'viewer', deleted_at: null });
      }

      const hashedPassword = await bcrypt.hash(password || 'Ngo@123456', 12);
      const user = await User.create({
        name: person_name || organization_name,
        email: email.toLowerCase(),
        password: hashedPassword,
        mobile: phone_no || null,
        role_id: ngoRole?._id || null,
        role_slug: ngoRole?.slug || 'ngo',
        is_configurator: false,
        is_active: true,
        ngo_details: {
          organization_name,
          darpan_no,
          phone_no,
          person_name,
        },
      });

      // Also save into implementation_partner form collection
      const ipForm = await Form.findOne({ slug: 'implementation_partner', deleted_at: null });
      if (ipForm) {
        const IPModel = getFormModel(ipForm);
        await IPModel.create({
          form_slug: 'implementation_partner',
          status: 'submitted',
          data: {
            organization_name,
            darpan_no,
            email,
            phone_no,
            person_name,
            created_by_user_id: user._id.toString(),
          },
          created_by: user._id,
        });
      }

      return res.status(201).json({
        success: true,
        message: 'NGO Registration successful. Please login to continue.',
        user_id: user._id,
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },
};

module.exports = publicController;
