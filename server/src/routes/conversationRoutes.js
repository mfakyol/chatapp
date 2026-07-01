const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
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
} = require('../controllers/conversationController');

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

module.exports = router;
