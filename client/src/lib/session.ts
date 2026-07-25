import { closeChatWindow } from '@/services/chatWindow.service';
import { useChatStore } from '@/stores/chat.store';
import { useDraftStore } from '@/stores/draft.store';
import { usePresenceStore } from '@/stores/presence.store';

export function clearSessionState() {
  closeChatWindow();
  useDraftStore.getState().reset();
  useChatStore.getState().reset();
  usePresenceStore.getState().reset();
}
