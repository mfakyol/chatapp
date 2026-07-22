import type { RequestHandler } from 'express';
import { currentUser } from '../middleware/auth';
import { getIo } from '../utils/io';
import * as userService from '../services/user.service';
import * as friendshipService from '../services/friendship.service';

export const searchUsers: RequestHandler = async (req, res, next) => {
  try {
    const users = await userService.searchUsers(currentUser(req), req.query.q);
    res.json({ users });
  } catch (err) {
    next(err);
  }
};

export const sendFriendRequest: RequestHandler = async (req, res, next) => {
  try {
    const { auto } = await friendshipService.sendFriendRequest(
      currentUser(req),
      req.params.username,
      getIo(req)
    );
    if (auto) return res.json({ message: 'Friend request accepted' });
    res.status(201).json({ message: 'Friend request sent' });
  } catch (err) {
    next(err);
  }
};

export const acceptFriendRequest: RequestHandler = async (req, res, next) => {
  try {
    await friendshipService.acceptFriendRequest(currentUser(req), req.params.username, getIo(req));
    res.json({ message: 'Friend request accepted' });
  } catch (err) {
    next(err);
  }
};

export const declineFriendRequest: RequestHandler = async (req, res, next) => {
  try {
    await friendshipService.declineFriendRequest(currentUser(req), req.params.username, getIo(req));
    res.json({ message: 'Friend request declined' });
  } catch (err) {
    next(err);
  }
};

export const removeFriend: RequestHandler = async (req, res, next) => {
  try {
    await friendshipService.removeFriend(currentUser(req), req.params.username, getIo(req));
    res.json({ message: 'Friend removed' });
  } catch (err) {
    next(err);
  }
};

export const getFriends: RequestHandler = async (req, res, next) => {
  try {
    const friends = await friendshipService.listFriends(currentUser(req));
    res.json({ friends });
  } catch (err) {
    next(err);
  }
};

export const getFriendRequests: RequestHandler = async (req, res, next) => {
  try {
    const result = await friendshipService.listFriendRequests(currentUser(req));
    res.json(result);
  } catch (err) {
    next(err);
  }
};
