import { Router } from 'express';
const router = Router();

router.post('/', async (req, res) => {
  res.json({ message: 'Chat route live — Phase 4 will wire this up' });
});

router.get('/history/:sessionId', async (req, res) => {
  res.json({ sessionId: req.params.sessionId, messages: [] });
});

export default router;