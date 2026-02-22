const express = require('express');
const router = express.Router();
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const Task = require('../models/Task');
const { protect } = require('../middleware/auth');
const { sendWorkspaceInvite } = require('../services/emailService');

// Apply auth to all routes
router.use(protect);

// ─────────────────────────────────────────────
// GET /api/workspaces
// List workspaces the current user belongs to
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      'members.user': req.user._id,
    })
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    res.json(workspaces);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/workspaces
// Create a new workspace (creator becomes owner)
// ─────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Workspace name is required' });
    }

    const workspace = await Workspace.create({
      name: name.trim(),
      description: description?.trim(),
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'owner' }],
    });

    // Link workspace to user
    await User.findByIdAndUpdate(req.user._id, { workspace: workspace._id });

    const populated = await workspace.populate('members.user', 'name email');
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/workspaces/:id
// Get a single workspace (members only)
// ─────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email')
      .populate('invites.invitedBy', 'name email');

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    if (!workspace.isMember(req.user._id)) {
      return res.status(403).json({ message: 'Not a member of this workspace' });
    }

    res.json(workspace);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────
// PUT /api/workspaces/:id
// Update workspace name/description (owner/admin only)
// ─────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const role = workspace.getMemberRole(req.user._id);
    if (!['owner', 'admin'].includes(role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (req.body.name) workspace.name = req.body.name.trim();
    if (req.body.description !== undefined) workspace.description = req.body.description.trim();

    await workspace.save();
    res.json(workspace);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/workspaces/:id/invite
// Send email invite to join workspace (owner/admin only)
// Body: { email, role? }
// ─────────────────────────────────────────────
router.post('/:id/invite', async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const role = workspace.getMemberRole(req.user._id);
    if (!['owner', 'admin'].includes(role)) {
      return res.status(403).json({ message: 'Only owners and admins can invite members' });
    }

    const { email, role: inviteRole = 'member' } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    // Check if already a member
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser && workspace.isMember(existingUser._id)) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    // Check for existing pending invite
    const existingInvite = workspace.invites.find(
      (inv) => inv.email === email.toLowerCase() && inv.status === 'pending'
    );
    if (existingInvite) {
      return res.status(400).json({ message: 'Invite already sent to this email' });
    }

    const token = workspace.createInviteToken();

    workspace.invites.push({
      email: email.toLowerCase(),
      token,
      role: inviteRole,
      invitedBy: req.user._id,
    });

    await workspace.save();

    // Send invite email (graceful fallback if email service unavailable)
    try {
      await sendWorkspaceInvite(req.user, email, workspace, token);
    } catch (emailErr) {
      console.error('Failed to send invite email:', emailErr.message);
    }

    res.status(201).json({
      message: `Invite sent to ${email}`,
      token, // Return token so frontend can also build a manual invite link
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/workspaces/accept-invite
// Accept an invite using the token (public-ish – user must be logged in)
// Body: { token }
// ─────────────────────────────────────────────
router.post('/accept-invite', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Token is required' });

    const workspace = await Workspace.findOne({ 'invites.token': token });
    if (!workspace) return res.status(404).json({ message: 'Invalid or expired invite' });

    const invite = workspace.invites.find((inv) => inv.token === token);

    if (invite.status !== 'pending') {
      return res.status(400).json({ message: 'Invite has already been used or expired' });
    }

    if (new Date() > invite.expiresAt) {
      invite.status = 'expired';
      await workspace.save();
      return res.status(400).json({ message: 'Invite has expired' });
    }

    // Verify the logged-in user's email matches the invite
    if (req.user.email !== invite.email) {
      return res.status(403).json({
        message: `This invite was sent to ${invite.email}. Please log in with that account.`,
      });
    }

    if (workspace.isMember(req.user._id)) {
      return res.status(400).json({ message: 'You are already a member of this workspace' });
    }

    // Add member
    workspace.members.push({ user: req.user._id, role: invite.role });
    invite.status = 'accepted';
    invite.acceptedAt = new Date();

    await workspace.save();

    // Link workspace to user
    await User.findByIdAndUpdate(req.user._id, { workspace: workspace._id });

    const populated = await workspace.populate('members.user', 'name email');
    res.json({ message: 'Successfully joined workspace', workspace: populated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/workspaces/:id/members
// List all members (members only)
// ─────────────────────────────────────────────
router.get('/:id/members', async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id).populate(
      'members.user',
      'name email createdAt'
    );

    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    if (!workspace.isMember(req.user._id)) {
      return res.status(403).json({ message: 'Not a member of this workspace' });
    }

    res.json(workspace.members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────
// PUT /api/workspaces/:id/members/:userId/role
// Change a member's role (owner only)
// Body: { role }
// ─────────────────────────────────────────────
router.put('/:id/members/:userId/role', async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the workspace owner can change roles' });
    }

    if (req.params.userId === req.user._id.toString()) {
      return res.status(400).json({ message: "You can't change your own role" });
    }

    const member = workspace.members.find(
      (m) => m.user.toString() === req.params.userId
    );
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Role must be admin or member' });
    }

    member.role = role;
    await workspace.save();

    res.json({ message: 'Role updated', member });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/workspaces/:id/members/:userId
// Remove a member (owner/admin, or self-leave)
// ─────────────────────────────────────────────
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const requesterRole = workspace.getMemberRole(req.user._id);
    const isSelf = req.params.userId === req.user._id.toString();

    if (!isSelf && !['owner', 'admin'].includes(requesterRole)) {
      return res.status(403).json({ message: 'Not authorized to remove members' });
    }

    if (workspace.owner.toString() === req.params.userId && !isSelf) {
      return res.status(400).json({ message: "Can't remove the workspace owner" });
    }

    workspace.members = workspace.members.filter(
      (m) => m.user.toString() !== req.params.userId
    );

    await workspace.save();
    res.json({ message: isSelf ? 'Left workspace' : 'Member removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/workspaces/:id/tasks
// Get all tasks in a workspace (visible to all members)
// ─────────────────────────────────────────────
router.get('/:id/tasks', async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    if (!workspace.isMember(req.user._id)) {
      return res.status(403).json({ message: 'Not a member of this workspace' });
    }

    const memberIds = workspace.members.map((m) => m.user);

    const tasks = await Task.find({ user: { $in: memberIds }, workspace: req.params.id })
      .populate('user', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/workspaces/:id
// Delete workspace (owner only)
// ─────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can delete a workspace' });
    }

    await Workspace.findByIdAndDelete(req.params.id);
    res.json({ message: 'Workspace deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;