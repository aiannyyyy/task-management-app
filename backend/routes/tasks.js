const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const upload = require('../config/multer');
const path = require('path');
const fs = require('fs');
const { addHistory, getStatusLabel, getPriorityLabel, formatDate } = require('../utils/taskHistory');
const { generateNextOccurrence } = require('../services/recurringTaskService');

router.use(protect);

// ─── Helper: verify user can access task ────────────────────────────────────
// A task is accessible if:
//   (a) it belongs to the current user, OR
//   (b) it belongs to a workspace the current user is a member of
const canAccessTask = async (task, userId) => {
  if (task.user.toString() === userId.toString()) return true;
  if (task.workspace) {
    const ws = await Workspace.findById(task.workspace);
    if (ws && ws.isMember(userId)) return true;
  }
  return false;
};

// ─── GET all tasks ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { workspaceId } = req.query;

    let query;

    if (workspaceId) {
      // Verify membership
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace || !workspace.isMember(req.user._id)) {
        return res.status(403).json({ message: 'Not a member of this workspace' });
      }
      query = { workspace: workspaceId };
    } else {
      // Personal tasks: owned by user and not in a workspace
      query = { user: req.user._id, workspace: null };
    }

    const tasks = await Task.find(query)
      .populate('user', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GET single task ─────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('user', 'name email')
      .populate('assignedTo', 'name email');

    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (!(await canAccessTask(task, req.user._id))) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── CREATE task ─────────────────────────────────────────────────────────────
router.post('/', upload.array('files', 5), async (req, res) => {
  try {
    const attachments = req.files
      ? req.files.map((file) => ({
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        }))
      : [];

    // Resolve workspace
    let workspaceId = req.body.workspace || null;
    if (workspaceId) {
      const ws = await Workspace.findById(workspaceId);
      if (!ws || !ws.isMember(req.user._id)) {
        return res.status(403).json({ message: 'Not a member of this workspace' });
      }
    }

    // Resolve assignee
    let assignedTo = null;
    if (req.body.assignedTo) {
      const assignee = await User.findById(req.body.assignedTo);
      if (!assignee) return res.status(404).json({ message: 'Assignee not found' });
      if (workspaceId) {
        const ws = await Workspace.findById(workspaceId);
        if (!ws.isMember(req.body.assignedTo)) {
          return res.status(400).json({ message: 'Assignee is not a workspace member' });
        }
      }
      assignedTo = req.body.assignedTo;
    }

    const task = new Task({
      user: req.user._id,
      workspace: workspaceId,
      assignedTo,
      title: req.body.title,
      description: req.body.description,
      status: req.body.status,
      priority: req.body.priority,
      category: req.body.category,
      labels: req.body.labels ? JSON.parse(req.body.labels) : [],
      attachments,
      dueDate: req.body.dueDate,
      isRecurring: req.body.isRecurring === 'true' || req.body.isRecurring === true,
      recurringPattern: req.body.recurringPattern || 'none',
      recurringInterval: parseInt(req.body.recurringInterval) || 1,
      recurringEndDate: req.body.recurringEndDate || null,
    });

    addHistory(task, req.user, 'created', `Created task "${task.title}"`);

    if (assignedTo) {
      const assignee = await User.findById(assignedTo);
      addHistory(task, req.user, 'assigned', `Assigned to ${assignee.name}`);
    }

    const newTask = await task.save();
    const populated = await newTask.populate('assignedTo', 'name email');
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ─── UPDATE task ─────────────────────────────────────────────────────────────
router.put('/:id', upload.array('files', 5), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (!(await canAccessTask(task, req.user._id))) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Title
    if (req.body.title && req.body.title !== task.title) {
      addHistory(task, req.user, 'updated', `Changed title from "${task.title}" to "${req.body.title}"`, 'title', task.title, req.body.title);
      task.title = req.body.title;
    }

    // Description
    if (req.body.description !== undefined && req.body.description !== task.description) {
      addHistory(task, req.user, 'updated', 'Updated description', 'description', task.description, req.body.description);
      task.description = req.body.description;
    }

    // Status
    if (req.body.status && req.body.status !== task.status) {
      addHistory(task, req.user, 'status_changed', `Changed status from ${getStatusLabel(task.status)} to ${getStatusLabel(req.body.status)}`, 'status', task.status, req.body.status);
      task.status = req.body.status;
    }

    // Priority
    if (req.body.priority && req.body.priority !== task.priority) {
      addHistory(task, req.user, 'priority_changed', `Changed priority from ${getPriorityLabel(task.priority)} to ${getPriorityLabel(req.body.priority)}`, 'priority', task.priority, req.body.priority);
      task.priority = req.body.priority;
    }

    // Category
    if (req.body.category && req.body.category !== task.category) {
      addHistory(task, req.user, 'updated', `Changed category to ${req.body.category}`, 'category', task.category, req.body.category);
      task.category = req.body.category;
    }

    // Labels
    if (req.body.labels) {
      const newLabels = JSON.parse(req.body.labels);
      const oldLabels = task.labels;
      newLabels.filter((l) => !oldLabels.includes(l)).forEach((l) => addHistory(task, req.user, 'label_added', `Added label "${l}"`));
      oldLabels.filter((l) => !newLabels.includes(l)).forEach((l) => addHistory(task, req.user, 'label_removed', `Removed label "${l}"`));
      task.labels = newLabels;
    }

    // Due date
    if (req.body.dueDate !== undefined) {
      const newDueDate = req.body.dueDate || null;
      if (String(newDueDate) !== String(task.dueDate)) {
        const desc = newDueDate
          ? task.dueDate ? `Changed due date from ${formatDate(task.dueDate)} to ${formatDate(newDueDate)}` : `Set due date to ${formatDate(newDueDate)}`
          : 'Removed due date';
        addHistory(task, req.user, 'due_date_changed', desc, 'dueDate', task.dueDate, newDueDate);
        task.dueDate = newDueDate;
      }
    }

    // Recurring
    if (req.body.isRecurring !== undefined) {
      const newIsRecurring = req.body.isRecurring === 'true' || req.body.isRecurring === true;
      if (newIsRecurring !== task.isRecurring) {
        task.isRecurring = newIsRecurring;
        addHistory(task, req.user, 'recurring_updated', newIsRecurring ? 'Enabled recurring' : 'Disabled recurring');
      }
    }
    if (req.body.recurringPattern && req.body.recurringPattern !== task.recurringPattern) {
      addHistory(task, req.user, 'recurring_updated', `Changed recurring pattern from ${task.recurringPattern} to ${req.body.recurringPattern}`);
      task.recurringPattern = req.body.recurringPattern;
    }
    if (req.body.recurringInterval) task.recurringInterval = parseInt(req.body.recurringInterval);
    if (req.body.recurringEndDate !== undefined) task.recurringEndDate = req.body.recurringEndDate || null;

    // Attachments
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map((file) => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      }));
      newAttachments.forEach((att) => addHistory(task, req.user, 'attachment_added', `Added attachment "${att.originalName}"`));
      task.attachments = [...task.attachments, ...newAttachments];
    }

    const updatedTask = await task.save();
    const populated = await updatedTask.populate('assignedTo', 'name email');
    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ─── ASSIGN task ─────────────────────────────────────────────────────────────
// PUT /api/tasks/:id/assign
// Body: { assignedTo: userId | null }
router.put('/:id/assign', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (!(await canAccessTask(task, req.user._id))) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { assignedTo } = req.body;

    if (assignedTo) {
      // Validate assignee exists
      const assignee = await User.findById(assignedTo);
      if (!assignee) return res.status(404).json({ message: 'Assignee not found' });

      // If task is in a workspace, assignee must be a member
      if (task.workspace) {
        const ws = await Workspace.findById(task.workspace);
        if (!ws.isMember(assignedTo)) {
          return res.status(400).json({ message: 'Assignee must be a workspace member' });
        }
      }

      const oldAssignee = task.assignedTo
        ? await User.findById(task.assignedTo)
        : null;

      task.assignedTo = assignedTo;
      addHistory(
        task,
        req.user,
        'assigned',
        oldAssignee
          ? `Reassigned from ${oldAssignee.name} to ${assignee.name}`
          : `Assigned to ${assignee.name}`,
        'assignedTo',
        task.assignedTo,
        assignedTo
      );
    } else {
      // Unassign
      if (task.assignedTo) {
        const oldAssignee = await User.findById(task.assignedTo);
        addHistory(task, req.user, 'unassigned', `Unassigned from ${oldAssignee?.name ?? 'user'}`, 'assignedTo', task.assignedTo, null);
      }
      task.assignedTo = null;
    }

    await task.save();
    const populated = await task.populate('assignedTo', 'name email');
    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ─── DELETE attachment ────────────────────────────────────────────────────────
router.delete('/:id/attachments/:filename', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!(await canAccessTask(task, req.user._id))) return res.status(403).json({ message: 'Not authorized' });

    const attachment = task.attachments.find((att) => att.filename === req.params.filename);
    task.attachments = task.attachments.filter((att) => att.filename !== req.params.filename);
    if (attachment) addHistory(task, req.user, 'attachment_deleted', `Deleted attachment "${attachment.originalName}"`);

    const filePath = path.join(__dirname, '../uploads', req.params.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await task.save();
    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Download attachment ──────────────────────────────────────────────────────
router.get('/:id/attachments/:filename', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!(await canAccessTask(task, req.user._id))) return res.status(403).json({ message: 'Not authorized' });

    const attachment = task.attachments.find((att) => att.filename === req.params.filename);
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });

    const filePath = path.join(__dirname, '../uploads', req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });

    res.download(filePath, attachment.originalName);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Comments ─────────────────────────────────────────────────────────────────
router.post('/:id/comments', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!(await canAccessTask(task, req.user._id))) return res.status(403).json({ message: 'Not authorized' });

    task.comments.push({ user: req.user._id, userName: req.user.name, text: req.body.text });
    addHistory(task, req.user, 'comment_added', 'Added a comment');
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id/comments/:commentId', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!(await canAccessTask(task, req.user._id))) return res.status(403).json({ message: 'Not authorized' });

    const comment = task.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized to delete this comment' });

    task.comments.pull(req.params.commentId);
    addHistory(task, req.user, 'comment_deleted', 'Deleted a comment');
    await task.save();
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Subtasks ─────────────────────────────────────────────────────────────────
router.post('/:id/subtasks', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!(await canAccessTask(task, req.user._id))) return res.status(403).json({ message: 'Not authorized' });

    task.subtasks.push({ text: req.body.text, completed: false });
    addHistory(task, req.user, 'subtask_added', `Added subtask "${req.body.text}"`);
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/:id/subtasks/:subtaskId', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!(await canAccessTask(task, req.user._id))) return res.status(403).json({ message: 'Not authorized' });

    const subtask = task.subtasks.id(req.params.subtaskId);
    if (!subtask) return res.status(404).json({ message: 'Subtask not found' });

    subtask.completed = req.body.completed;
    const action = req.body.completed ? 'subtask_completed' : 'subtask_uncompleted';
    addHistory(task, req.user, action, `${req.body.completed ? 'Completed' : 'Uncompleted'} subtask "${subtask.text}"`);
    await task.save();
    res.json(task);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id/subtasks/:subtaskId', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!(await canAccessTask(task, req.user._id))) return res.status(403).json({ message: 'Not authorized' });

    const subtask = task.subtasks.id(req.params.subtaskId);
    if (subtask) addHistory(task, req.user, 'subtask_deleted', `Deleted subtask "${subtask.text}"`);
    task.subtasks.pull(req.params.subtaskId);
    await task.save();
    res.json({ message: 'Subtask deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Delete task ──────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!(await canAccessTask(task, req.user._id))) return res.status(403).json({ message: 'Not authorized' });

    task.attachments.forEach((att) => {
      const filePath = path.join(__dirname, '../uploads', att.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Recurrence ───────────────────────────────────────────────────────────────
router.put('/:id/recurrence', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!(await canAccessTask(task, req.user._id))) return res.status(403).json({ message: 'Not authorized' });

    const { frequency, interval, daysOfWeek, endDate } = req.body;
    if (!frequency) {
      task.isRecurring = false;
      task.recurrence = undefined;
      addHistory(task, req.user, 'recurring_updated', 'Removed task recurrence');
    } else {
      task.isRecurring = true;
      task.recurrence = { frequency, interval: interval || 1, daysOfWeek: daysOfWeek || [], endDate: endDate || null };
      addHistory(task, req.user, 'recurring_updated', `Set recurrence: ${frequency}${interval > 1 ? ` (every ${interval})` : ''}`);
    }

    await task.save();
    res.json(task);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/:id/generate-next', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!task.isRecurring) return res.status(400).json({ message: 'Task is not recurring' });

    const newTask = await generateNextOccurrence(task, req.user);
    if (!newTask) return res.status(400).json({ message: 'Could not generate next occurrence' });

    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Test notification ────────────────────────────────────────────────────────
router.post('/:id/notify', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const { sendDueDateReminder } = require('../services/emailService');
    const daysUntilDue = Math.ceil((new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    await sendDueDateReminder(req.user, task, daysUntilDue);
    res.json({ message: 'Notification sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;