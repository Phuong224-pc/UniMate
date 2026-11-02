import express from 'express';
import { handleChatMessage } from '../controllers/chatController.js';
import { optionalAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', optionalAuth, handleChatMessage);

export default router;
