import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { serveAttachment } from '../controllers/attachment.controller';

const router = Router();

router.use(requireAuth);
router.get('/:filename', serveAttachment);

export default router;
