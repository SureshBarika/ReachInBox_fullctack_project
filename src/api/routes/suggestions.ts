import { Router } from 'express';
import { SuggestionController } from '../controllers/SuggestionController';

const router = Router();
const controller = new SuggestionController();

router.post('/:id/suggest-reply', (req, res) => controller.suggestReply(req, res));

export default router;