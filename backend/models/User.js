const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  matricula: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  rol: { type: String, required: true, enum: ["alumno", "admin"], default: "alumno" },
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
