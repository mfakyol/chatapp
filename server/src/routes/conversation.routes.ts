import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { upload } from '../middleware/upload';
import {
  listConversations,
  createDirectConversation,
  createGroupConversation,
  getMessages,
  searchMessages,
  editMessage,
  deleteMessage,
  sendAttachment,
  renameConversation,
  addMember,
  removeMember,
  leaveGroup,
} from '../controllers/conversation.controller';

const router = Router();

router.use(requireAuth);

router.get('/', listConversations);
router.get('/search', searchMessages);
router.post('/direct', createDirectConversation);
router.post('/group', createGroupConversation);
router.get('/:conversationId/messages', getMessages);
router.patch('/:conversationId/messages/:messageId', editMessage);
router.delete('/:conversationId/messages/:messageId', deleteMessage);
router.post('/:conversationId/attachments', upload.single('file'), sendAttachment);
router.patch('/:conversationId', renameConversation);
router.post('/:conversationId/members', addMember);
router.delete('/:conversationId/members/:username', removeMember);
router.post('/:conversationId/leave', leaveGroup);

export default router;
