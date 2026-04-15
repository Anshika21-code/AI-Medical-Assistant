import { Router } from 'express';
import { searchResearch } from '../controllers/researchController.js';

const router = Router();

router.get('/search', searchResearch);

export default router;