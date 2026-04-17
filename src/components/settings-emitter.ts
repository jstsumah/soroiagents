
// A simple event emitter to notify components of settings changes.
type Listener = () => void;
const listeners: Listener[] = [];

export const settingsEmitter = {
  subscribe: (listener: Listener): (() => void) => {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  },
  emit: () => {
    listeners.forEach(listener => listener());
  },
};
