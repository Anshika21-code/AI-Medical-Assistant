import { Router } from 'express';
const router = Router();

router.get('/search', async (req, res) => {
  res.json({ message: 'Research route live — Phase 2 will wire this up' });
});

export default router;