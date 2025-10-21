import { Router } from 'express';
import { AccountController } from '../controllers/AccountController';

const router = Router();
const controller = new AccountController();

router.get('/', (req, res) => controller.getAccounts(req, res));

export default router;