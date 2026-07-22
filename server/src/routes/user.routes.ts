import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { searchUsersSchema, usernameParamSchema } from '../schemas/user.schema';
import {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  getFriends,
  getFriendRequests,
} from '../controllers/user.controller';

const router = Router();

router.use(requireAuth);

router.get('/search', validate(searchUsersSchema), searchUsers);
router.get('/friends', getFriends);
router.get('/friend-requests', getFriendRequests);
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
