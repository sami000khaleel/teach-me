const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
  {
    offer: mongoose.Schema.Types.Mixed,
    teacherId: {
      type: String,
      required: true,
    },
    teacherCandidate: mongoose.Schema.Types.Mixed,
    courseId: {
      type: String,
      required: true,
    },
    messages: [
      {
        content: { type: String, required: true },
        studentId: { type: String, required: true },
        studentName: { type: String, required: true },
        studentImage: { type: String, required: true },
      },
    ],
    students: [
      {
        checkOccurrences:[{
          type:Date,
          required:true,
        }],
        studentLogs: [
          {
            connectedAt: Date,
            disconnectedAt: Date,
          },
        ],
        observations: [
          {
            title: {
              type: String,
              enum: [
                "notAttentive",
                "usingPhone",
                "noFace",
                "facesDoNotMatch"
              ],
              required: true,
            },
            occurrencesDates: [
              {
                  type: Date,
                  default: Date.now(),
                  required: true,
              },
            ],
          },
        ],
        studentId: {
          type: String,
          required: true,
        },
        answer: mongoose.Schema.Types.Mixed,
        candidate: mongoose.Schema.Types.Mixed,
      },
    ],
    onGoing: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    endedAt: {
      type: Date,
    },
  },
  { versionKey: false }
);
module.exports = mongoose.model("Call", userSchema);