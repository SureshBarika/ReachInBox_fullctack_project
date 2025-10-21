import { Router } from 'express';
import { EmailController } from '../controllers/EmailController';

const router = Router();
const controller = new EmailController();

router.get('/', (req, res) => controller.getEmails(req, res));
router.get('/search', (req, res) => controller.searchEmails(req, res));
router.get('/:id', (req, res) => controller.getEmailById(req, res));

export default router;