import mongoose from "mongoose";

const SupportLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, default: null },
    role: { type: String, default: "guest" },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    resolvedBy: { type: String, enum: ["faq", "llm"], required: true },
    modelUsed: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("SupportLog", SupportLogSchema);
