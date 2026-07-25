import { Types } from 'mongoose';

export function userRoom(id: Types.ObjectId | string): string {
  return `user:${id.toString()}`;
}

export function userRooms(ids: Array<Types.ObjectId | string>): string[] {
  return ids.map(userRoom);
}
