import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { avatarUpload } from '../middleware/avatarUpload';
import { validateUpload } from '../middleware/validateUpload';
import { validate } from '../middleware/validate';
import { uploadLimiter, messageLimiter } from '../middleware/rateLimit';
import {
  createDirectSchema,
  createGroupSchema,
  conversationIdParamSchema,
  setMemberRoleSchema,
  sendMessageSchema,
  messageParamsSchema,
  editMessageSchema,
  reactSchema,
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
  sendMessage,
  markRead,
  reactToMessage,
  editMessage,
  deleteMessage,
  sendAttachment,
  ensureMembership,
  renameConversation,
  setMemberRole,
  uploadGroupAvatar,
  serveGroupAvatar,
  addMember,
  removeMember,
  leaveGroup,
  deleteConversation,
} from '../controllers/conversation.controller';

const router = Router();

router.use(requireAuth);

router.get('/', listConversations);
router.get('/search', validate(searchMessagesSchema), searchMessages);
router.post('/direct', validate(createDirectSchema), createDirectConversation);
router.post('/group', validate(createGroupSchema), createGroupConversation);

router.get('/:conversationId/messages', validate(getMessagesSchema), getMessages);
router.post('/:conversationId/messages', messageLimiter, validate(sendMessageSchema), sendMessage);
router.post('/:conversationId/read', validate(conversationIdParamSchema), markRead);
router.post(
  '/:conversationId/messages/:messageId/reactions',
  validate(reactSchema),
  reactToMessage
);
router.patch('/:conversationId/messages/:messageId', validate(editMessageSchema), editMessage);
router.delete('/:conversationId/messages/:messageId', validate(messageParamsSchema), deleteMessage);
router.post(
  '/:conversationId/attachments',
  uploadLimiter,
  validate(conversationIdParamSchema),
  ensureMembership,
  upload.single('file'),
  validateUpload,
  sendAttachment
);

router.patch('/:conversationId', validate(renameSchema), renameConversation);
router.post(
  '/:conversationId/avatar',
  uploadLimiter,
  validate(conversationIdParamSchema),
  avatarUpload.single('avatar'),
  uploadGroupAvatar
);
router.get('/:conversationId/avatar', validate(conversationIdParamSchema), serveGroupAvatar);
router.post('/:conversationId/members', validate(addMemberSchema), addMember);
router.patch(
  '/:conversationId/members/:username',
  validate(setMemberRoleSchema),
  setMemberRole
);
router.delete('/:conversationId/members/:username', validate(removeMemberSchema), removeMember);
router.post('/:conversationId/leave', validate(conversationIdParamSchema), leaveGroup);
router.delete('/:conversationId', validate(conversationIdParamSchema), deleteConversation);

export default router;
