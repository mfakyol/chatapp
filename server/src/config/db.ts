import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export async function connectDB(): Promise<void> {
  await mongoose.connect(env.mongoUri);
  logger.info('MongoDB connected');
}

export default connectDB;
