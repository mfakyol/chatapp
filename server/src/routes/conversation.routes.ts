import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { uploadLimiter } from '../middleware/rateLimit';
import {
  createDirectSchema,
  createGroupSchema,
  conversationIdParamSchema,
  messageParamsSchema,
  editMessageSchema,
  renameSchema,
  addMemberSchema,
  removeMemberSchema,
  getMessagesSchema,
  searchMessagesSchema,
} from '../schemas/conversation.schema';
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
router.get('/search', validate(searchMessagesSchema), searchMessages);
router.post('/direct', validate(createDirectSchema), createDirectConversation);
router.post('/group', validate(createGroupSchema), createGroupConversation);
router.get('/:conversationId/messages', validate(getMessagesSchema), getMessages);
router.patch('/:conversationId/messages/:messageId', validate(editMessageSchema), editMessage);
router.delete('/:conversationId/messages/:messageId', validate(messageParamsSchema), deleteMessage);
router.post(
  '/:conversationId/attachments',
  uploadLimiter,
  upload.single('file'),
  validate(conversationIdParamSchema),
  sendAttachment
);
router.patch('/:conversationId', validate(renameSchema), renameConversation);
router.post('/:conversationId/members', validate(addMemberSchema), addMember);
router.delete('/:conversationId/members/:username', validate(removeMemberSchema), removeMember);
router.post('/:conversationId/leave', validate(conversationIdParamSchema), leaveGroup);

export default router;
