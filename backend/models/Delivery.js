const mongoose = require("mongoose");

const DeliverySchema = new mongoose.Schema({
  matricula: { type: String, required: true },
  materia: { type: String, required: true },
  tarea: { type: String, required: true },
  fecha_entrega: { type: Date, required: true },
  archivo_url: { type: String, required: true },
  estado: { type: String, enum: ["ENVIADO", "REVISADO", "APROBADO", "RECHAZADO", "ENTREGADO"], default: "REVISADO" },
}, { timestamps: true });

module.exports = mongoose.model("Delivery", DeliverySchema);
