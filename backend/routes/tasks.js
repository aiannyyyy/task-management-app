const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { protect } = require('../middleware/auth');
const upload = require('../config/multer');
const path = require('path');
const fs = require('fs');
const { addHistory, getStatusLabel, getPriorityLabel, formatDate } = require('../utils/taskHistory');
const { generateNextOccurrence } = require('../services/recurringTaskService');

// Apply protect middleware to all routes
router.use(protect);

// GET all tasks (only user's tasks)
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single task
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE task with file upload
router.post('/', upload.array('files', 5), async (req, res) => {
  try {
    const attachments = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    })) : [];

    const task = new Task({
      user: req.user._id,
      title: req.body.title,
      description: req.body.description,
      status: req.body.status,
      priority: req.body.priority,
      category: req.body.category,
      labels: req.body.labels ? JSON.parse(req.body.labels) : [],
      attachments: attachments,
      dueDate: req.body.dueDate,
      isRecurring: req.body.isRecurring === 'true' || req.body.isRecurring === true,
      recurringPattern: req.body.recurringPattern || 'none',
      recurringInterval: parseInt(req.body.recurringInterval) || 1,
      recurringEndDate: req.body.recurringEndDate || null,
    });

    // Add creation history
    addHistory(task, req.user, 'created', `Created task "${task.title}"`);

    if (task.isRecurring && task.recurringPattern !== 'none') {
      addHistory(task, req.user, 'recurring_updated',
        `Set as recurring task (${task.recurringPattern}, every ${task.recurringInterval} ${task.recurringPattern === 'daily' ? 'day(s)' : task.recurringPattern === 'weekly' ? 'week(s)' : 'month(s)'})`
      );
    }

    const newTask = await task.save();
    res.status(201).json(newTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// UPDATE task with optional file upload
router.put('/:id', upload.array('files', 5), async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check title change
    if (req.body.title && req.body.title !== task.title) {
      addHistory(task, req.user, 'updated', `Changed title from "${task.title}" to "${req.body.title}"`, 'title', task.title, req.body.title);
      task.title = req.body.title;
    }

    // Check description change
    if (req.body.description !== undefined && req.body.description !== task.description) {
      addHistory(task, req.user, 'updated', `Updated description`, 'description', task.description, req.body.description);
      task.description = req.body.description;
    }

    // Check status change
    if (req.body.status && req.body.status !== task.status) {
      addHistory(
        task,
        req.user,
        'status_changed',
        `Changed status from ${getStatusLabel(task.status)} to ${getStatusLabel(req.body.status)}`,
        'status',
        task.status,
        req.body.status
      );
      task.status = req.body.status;
    }

    // Check priority change
    if (req.body.priority && req.body.priority !== task.priority) {
      addHistory(
        task,
        req.user,
        'priority_changed',
        `Changed priority from ${getPriorityLabel(task.priority)} to ${getPriorityLabel(req.body.priority)}`,
        'priority',
        task.priority,
        req.body.priority
      );
      task.priority = req.body.priority;
    }

    // Check category change
    if (req.body.category && req.body.category !== task.category) {
      addHistory(task, req.user, 'updated', `Changed category to ${req.body.category}`, 'category', task.category, req.body.category);
      task.category = req.body.category;
    }

    // Check labels change
    if (req.body.labels) {
      const newLabels = JSON.parse(req.body.labels);
      const oldLabels = task.labels;

      const added = newLabels.filter(l => !oldLabels.includes(l));
      const removed = oldLabels.filter(l => !newLabels.includes(l));

      added.forEach(label => {
        addHistory(task, req.user, 'label_added', `Added label "${label}"`);
      });

      removed.forEach(label => {
        addHistory(task, req.user, 'label_removed', `Removed label "${label}"`);
      });

      task.labels = newLabels;
    }

    // Check due date change
    if (req.body.dueDate !== undefined) {
      const newDueDate = req.body.dueDate || null;
      const oldDueDate = task.dueDate;

      if (String(newDueDate) !== String(oldDueDate)) {
        const description = newDueDate
          ? oldDueDate
            ? `Changed due date from ${formatDate(oldDueDate)} to ${formatDate(newDueDate)}`
            : `Set due date to ${formatDate(newDueDate)}`
          : `Removed due date`;

        addHistory(task, req.user, 'due_date_changed', description, 'dueDate', oldDueDate, newDueDate);
        task.dueDate = newDueDate;
      }
    }

    // Add new attachments
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      }));

      newAttachments.forEach(att => {
        addHistory(task, req.user, 'attachment_added', `Added attachment "${att.originalName}"`);
      });

      task.attachments = [...task.attachments, ...newAttachments];
    }

    // Check recurring changes
    if (req.body.isRecurring !== undefined) {
      const newIsRecurring = req.body.isRecurring === 'true' || req.body.isRecurring === true;
      if (newIsRecurring !== task.isRecurring) {
        task.isRecurring = newIsRecurring;
        addHistory(task, req.user, 'recurring_updated',
          newIsRecurring ? 'Enabled recurring' : 'Disabled recurring'
        );
      }
    }

    if (req.body.recurringPattern && req.body.recurringPattern !== task.recurringPattern) {
      addHistory(task, req.user, 'recurring_updated',
        `Changed recurring pattern from ${task.recurringPattern} to ${req.body.recurringPattern}`
      );
      task.recurringPattern = req.body.recurringPattern;
    }

    if (req.body.recurringInterval) {
      task.recurringInterval = parseInt(req.body.recurringInterval);
    }

    if (req.body.recurringEndDate !== undefined) {
      task.recurringEndDate = req.body.recurringEndDate || null;
    }

    const updatedTask = await task.save();
    res.json(updatedTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE attachment from task
router.delete('/:id/attachments/:filename', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const attachment = task.attachments.find(att => att.filename === req.params.filename);

    // Remove attachment from task
    task.attachments = task.attachments.filter(
      att => att.filename !== req.params.filename
    );

    // Add history
    if (attachment) {
      addHistory(task, req.user, 'attachment_deleted', `Deleted attachment "${attachment.originalName}"`);
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '../uploads', req.params.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await task.save();
    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Download/View attachment
router.get('/:id/attachments/:filename', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const attachment = task.attachments.find(att => att.filename === req.params.filename);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    const filePath = path.join(__dirname, '../uploads', req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.download(filePath, attachment.originalName);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ADD COMMENT to task
router.post('/:id/comments', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const comment = {
      user: req.user._id,
      userName: req.user.name,
      text: req.body.text,
    };

    task.comments.push(comment);

    // Add history
    addHistory(task, req.user, 'comment_added', `Added a comment`);

    await task.save();

    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE COMMENT from task
router.delete('/:id/comments/:commentId', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const comment = task.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    task.comments.pull(req.params.commentId);

    // Add history
    addHistory(task, req.user, 'comment_deleted', `Deleted a comment`);

    await task.save();

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Delete all attachments from filesystem
    task.attachments.forEach(att => {
      const filePath = path.join(__dirname, '../uploads', att.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ADD SUBTASK to task
router.post('/:id/subtasks', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const subtask = {
      text: req.body.text,
      completed: false,
    };

    task.subtasks.push(subtask);

    // Add history
    addHistory(task, req.user, 'subtask_added', `Added subtask "${req.body.text}"`);

    await task.save();

    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// TOGGLE SUBTASK completion
router.put('/:id/subtasks/:subtaskId', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const subtask = task.subtasks.id(req.params.subtaskId);
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    subtask.completed = req.body.completed;

    // Add history
    const action = req.body.completed ? 'subtask_completed' : 'subtask_uncompleted';
    const description = req.body.completed
      ? `Completed subtask "${subtask.text}"`
      : `Uncompleted subtask "${subtask.text}"`;

    addHistory(task, req.user, action, description);

    await task.save();

    res.json(task);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE SUBTASK from task
router.delete('/:id/subtasks/:subtaskId', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const subtask = task.subtasks.id(req.params.subtaskId);
    if (subtask) {
      addHistory(task, req.user, 'subtask_deleted', `Deleted subtask "${subtask.text}"`);
    }

    task.subtasks.pull(req.params.subtaskId);
    await task.save();

    res.json({ message: 'Subtask deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// SEND TEST NOTIFICATION
router.post('/:id/notify', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const { sendDueDateReminder } = require('../services/emailService');

    const dueDate = new Date(task.dueDate);
    const today = new Date();
    const diffTime = dueDate - today;
    const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    await sendDueDateReminder(req.user, task, daysUntilDue);

    res.json({ message: 'Notification sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// SET/UPDATE RECURRENCE
router.put('/:id/recurrence', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const { frequency, interval, daysOfWeek, endDate } = req.body;

    if (!frequency) {
      // Remove recurrence
      task.isRecurring = false;
      task.recurrence = undefined;
      addHistory(task, req.user, 'recurrence_removed', 'Removed task recurrence');
    } else {
      // Set/update recurrence
      task.isRecurring = true;
      task.recurrence = {
        frequency,
        interval: interval || 1,
        daysOfWeek: daysOfWeek || [],
        endDate: endDate || null
      };

      const desc = `Set recurrence: ${frequency}${interval > 1 ? ` (every ${interval})` : ''}`;
      addHistory(task, req.user, 'recurrence_added', desc);
    }

    await task.save();
    res.json(task);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// MANUALLY GENERATE NEXT OCCURRENCE
router.post('/:id/generate-next', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!task.isRecurring) {
      return res.status(400).json({ message: 'Task is not recurring' });
    }

    const newTask = await generateNextOccurrence(task, req.user);

    if (!newTask) {
      return res.status(400).json({ message: 'Could not generate next occurrence' });
    }

    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;