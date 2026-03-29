const express = require('express');
const cors = require('cors');
require('dotenv').config();

const configRoutes = require('./routes/config');
const webhookRoutes = require('./routes/webhook');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/config', configRoutes);
app.use('/webhook', webhookRoutes);

const { startScheduler } = require('./scheduler');

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'SaaS Webhook API is running' });
});

// Start scheduler engine
startScheduler();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
