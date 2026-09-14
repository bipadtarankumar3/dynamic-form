// mongo-server/src/models/User.model.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true },
  email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:       { type: String, required: true },
  mobile:         { type: String, default: null },
  employee_code:  { type: String, default: null },
  department:     { type: String, default: null },
  designation:    { type: String, default: null },
  profile_pic:    { type: String, default: null },
  role_id:        { type: mongoose.Schema.Types.ObjectId, ref: "Role", default: null },
  role_slug:      { type: String, default: null },
  is_active:      { type: Boolean, default: true },
  is_configurator:{ type: Boolean, default: false },
  is_first_login: { type: Boolean, default: false },
  last_login_at:  { type: Date, default: null },
  deleted_at:     { type: Date, default: null },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ deleted_at: 1 });

// Hash password before save
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model("User", UserSchema);
