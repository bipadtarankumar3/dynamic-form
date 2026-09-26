// mongo-server/src/models/User.model.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    mobile: { type: String, default: null },
    employee_code: { type: String, default: null },
    department: { type: String, default: null },
    designation: { type: String, default: null },
    profile_pic: { type: String, default: null },
    role_id: { type: mongoose.Schema.Types.ObjectId, ref: "Role", default: null },
    role_slug: { type: String, default: "" },
    is_configurator: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    is_first_login: { type: Boolean, default: false },
    ngo_details: { type: mongoose.Schema.Types.Mixed, default: null },
    last_login_at: { type: Date, default: null },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

UserSchema.index({ role_slug: 1 });
UserSchema.index({ deleted_at: 1 });

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  if (this.password && !this.password.startsWith("$2a$") && !this.password.startsWith("$2b$")) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
