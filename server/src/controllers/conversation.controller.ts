import type { RequestHandler } from 'express';
import { currentUser } from '../middleware/auth';
import { getIo } from '../utils/io';
import { badRequest } from '../errors/AppError';
import * as conversationService from '../services/conversation.service';
import * as messageService from '../services/message.service';

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export const listConversations: RequestHandler = async (req, res, next) => {
  try {
    const conversations = await conversationService.listConversations(currentUser(req));
    res.json({ conversations });
  } catch (err) {
    next(err);
  }
};

export const createDirectConversation: RequestHandler = async (req, res, next) => {
  try {
    const conversation = await conversationService.createDirectConversation(
      currentUser(req),
      req.body.username
    );
    res.status(201).json({ conversation });
  } catch (err) {
    next(err);
  }
};

export const createGroupConversation: RequestHandler = async (req, res, next) => {
  try {
    const conversation = await conversationService.createGroupConversation(
      currentUser(req),
      req.body.name,
      req.body.usernames
    );
    res.status(201).json({ conversation });
  } catch (err) {
    next(err);
  }
};

export const getMessages: RequestHandler = async (req, res, next) => {
  try {
    const limit = asString(req.query.limit);
    const messages = await messageService.getMessages(currentUser(req), req.params.conversationId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      around: asString(req.query.around),
      before: asString(req.query.before),
    });
    res.json({ messages });
  } catch (err) {
    next(err);
  }
};

export const searchMessages: RequestHandler = async (req, res, next) => {
  try {
    const messages = await messageService.searchMessages(
      currentUser(req),
      asString(req.query.q) ?? '',
      asString(req.query.conversationId)
    );
    res.json({ messages });
  } catch (err) {
    next(err);
  }
};

export const editMessage: RequestHandler = async (req, res, next) => {
  try {
    const message = await messageService.editMessage(
      currentUser(req),
      req.params.conversationId,
      req.params.messageId,
      req.body.content,
      getIo(req)
    );
    res.json({ message });
  } catch (err) {
    next(err);
  }
};

export const deleteMessage: RequestHandler = async (req, res, next) => {
  try {
    await messageService.deleteMessage(
      currentUser(req),
      req.params.conversationId,
      req.params.messageId,
      getIo(req)
    );
    res.json({ message: 'Message deleted' });
  } catch (err) {
    next(err);
  }
};

export const sendAttachment: RequestHandler = async (req, res, next) => {
  try {
    if (!req.file) throw badRequest('No file uploaded');
    const message = await messageService.createMessage(
      currentUser(req),
      req.params.conversationId,
      {
        content: asString(req.body.caption),
        attachment: {
          url: `/uploads/${req.file.filename}`,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
        },
      },
      getIo(req)
    );
    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
};

export const renameConversation: RequestHandler = async (req, res, next) => {
  try {
    const conversation = await conversationService.renameConversation(
      currentUser(req),
      req.params.conversationId,
      req.body.name,
      getIo(req)
    );
    res.json({ conversation });
  } catch (err) {
    next(err);
  }
};

export const addMember: RequestHandler = async (req, res, next) => {
  try {
    const conversation = await conversationService.addMember(
      currentUser(req),
      req.params.conversationId,
      req.body.username,
      getIo(req)
    );
    res.json({ conversation });
  } catch (err) {
    next(err);
  }
};

export const removeMember: RequestHandler = async (req, res, next) => {
  try {
    const conversation = await conversationService.removeMember(
      currentUser(req),
      req.params.conversationId,
      req.params.username,
      getIo(req)
    );
    res.json({ conversation });
  } catch (err) {
    next(err);
  }
};

export const leaveGroup: RequestHandler = async (req, res, next) => {
  try {
    await conversationService.leaveGroup(currentUser(req), req.params.conversationId, getIo(req));
    res.json({ message: 'Left group' });
  } catch (err) {
    next(err);
  }
};

export const deleteConversation: RequestHandler = async (req, res, next) => {
  try {
    await conversationService.deleteConversation(
      currentUser(req),
      req.params.conversationId,
      getIo(req)
    );
    res.json({ message: 'Conversation deleted' });
  } catch (err) {
    next(err);
  }
};
