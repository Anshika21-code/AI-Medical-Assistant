import { Router } from 'express';
import { searchResearch } from '../controllers/researchController.js';
import express from "express";
import { getResearchData } from "../controllers/researchController.js";
import { chatHandler } from "../controllers/chatController.js";


const router = express.Router();

router.get('/search', searchResearch);

router.post("/", getResearchData);

router.post("/", chatHandler);

export default router;