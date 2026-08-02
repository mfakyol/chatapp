import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { avatarUpload } from '../middleware/avatarUpload';
import { uploadLimiter } from '../middleware/rateLimit';
import {
  searchUsersSchema,
  usernameParamSchema,
  userIdParamSchema,
  updateProfileSchema,
} from '../schemas/user.schema';
import {
  searchUsers,
  updateMe,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  getFriends,
  getFriendRequests,
  uploadAvatar,
  serveAvatar,
} from '../controllers/user.controller';

const router = Router();

router.use(requireAuth);

router.get('/search', validate(searchUsersSchema), searchUsers);
router.get('/friends', getFriends);
router.get('/friend-requests', getFriendRequests);
router.patch('/me', validate(updateProfileSchema), updateMe);
router.post('/me/avatar', uploadLimiter, avatarUpload.single('avatar'), uploadAvatar);
router.get('/:userId/avatar', validate(userIdParamSchema), serveAvatar);
router.post('/friend-requests/:username', validate(usernameParamSchema), sendFriendRequest);
router.post(
  '/friend-requests/:username/accept',
  validate(usernameParamSchema),
  acceptFriendRequest
);
router.post(
  '/friend-requests/:username/decline',
  validate(usernameParamSchema),
  declineFriendRequest
);
router.delete('/friends/:username', validate(usernameParamSchema), removeFriend);

export default router;
