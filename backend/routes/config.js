const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');

// Get config by user id
router.get('/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        const { data, error } = await supabase
            .from('configurations')
            .select('*')
            .eq('user_id', user_id)
            .single();

        if (error && error.code !== 'PGRST116') {
            return res.status(400).json({ error: error.message });
        }

        res.json({ data });
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Create or update config
router.post('/', async (req, res) => {
    try {
        const { user_id, store_name, webhook_name } = req.body;
        
        if (!user_id || !store_name) {
            return res.status(400).json({ error: 'user_id and store_name are required' });
        }

        // Upsert configuration
        const { data, error } = await supabase
            .from('configurations')
            .upsert(
                { user_id, store_name, webhook_name, updated_at: new Date() },
                { onConflict: 'user_id' }
            )
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ data, webhook_url: `${process.env.BASE_URL || 'http://localhost:5000'}/webhook/${data.webhook_id}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
