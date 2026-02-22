const mongoose = require('mongoose');
const crypto = require('crypto');

const memberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'member'],
    default: 'member',
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

const inviteSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  token: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member',
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  },
  acceptedAt: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired'],
    default: 'pending',
  },
});

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a workspace name'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot be more than 300 characters'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [memberSchema],
    invites: [inviteSchema],
  },
  { timestamps: true }
);

// Helper: generate a secure invite token
workspaceSchema.methods.createInviteToken = function () {
  return crypto.randomBytes(32).toString('hex');
};

// Helper: check if a user is a member
workspaceSchema.methods.isMember = function (userId) {
  return this.members.some((m) => {
    const memberId = m.user._id || m.user;
    return memberId.toString() === userId.toString();
  });
};

// Helper: get a member's role
workspaceSchema.methods.getMemberRole = function (userId) {
  const member = this.members.find((m) => {
    const memberId = m.user._id || m.user;
    return memberId.toString() === userId.toString();
  });
  return member ? member.role : null;
};

module.exports = mongoose.model('Workspace', workspaceSchema);