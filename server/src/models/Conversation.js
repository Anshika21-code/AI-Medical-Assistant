const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  sources: {
    publications: [{ title: String, authors: [String], year: Number, url: String, source: String, abstract: String }],
    trials: [{ title: String, status: String, eligibility: String, location: String, contact: String, nctId: String }]
  },
  timestamp: { type: Date, default: Date.now }
});

const ConversationSchema = new mongoose.Schema({
  userId: { type: String, default: 'anonymous' },
  title: { type: String, default: 'New Conversation' },
  context: {
    disease: String,
    patientName: String,
    location: String,
    intent: String
  },
  messages: [MessageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ConversationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Conversation', ConversationSchema);