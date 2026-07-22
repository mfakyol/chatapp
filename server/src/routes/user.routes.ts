import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
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

router.get('/search', searchUsers);
router.get('/friends', getFriends);
router.get('/friend-requests', getFriendRequests);
router.post('/friend-requests/:username', sendFriendRequest);
router.post('/friend-requests/:username/accept', acceptFriendRequest);
router.post('/friend-requests/:username/decline', declineFriendRequest);
router.delete('/friends/:username', removeFriend);

export default router;
