const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  getFriends,
  getFriendRequests,
} = require('../controllers/userController');

const router = Router();

router.use(requireAuth);

router.get('/search', searchUsers);
router.get('/friends', getFriends);
router.get('/friend-requests', getFriendRequests);
router.post('/friend-requests/:username', sendFriendRequest);
router.post('/friend-requests/:username/accept', acceptFriendRequest);
router.post('/friend-requests/:username/decline', declineFriendRequest);
router.delete('/friends/:username', removeFriend);

module.exports = router;
