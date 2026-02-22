// server.js
const app = require('./app');
const connectDB = require('./config/db');
const { startNotificationScheduler } = require('./services/notificationScheduler');
const { startRecurringTaskScheduler } = require('./services/recurringTaskService');

connectDB();
startNotificationScheduler();
startRecurringTaskScheduler();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));