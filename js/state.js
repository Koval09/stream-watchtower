// Channel State Management Module
// Handles localStorage and URL Query Parameters synchronization

let channels = [];
const listeners = [];

// LocalStorage Key
const STORAGE_KEY = 'stream_watchtower_channels';

// Initialize state from URL or localStorage
function init() {
  try {
    const params = new URLSearchParams(window.location.search);
    const channelsParam = params.get('channels');

    if (channelsParam) {
      // Priority 1: URL query param
      channels = channelsParam.split(',')
        .map(c => c.trim().toLowerCase())
        .filter(c => c.length > 0);
      
      // Keep localStorage in sync with the loaded URL query param
      saveToStorage();
    } else {
      // Priority 2: localStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        channels = JSON.parse(saved);
      }
    }
  } catch (error) {
    console.error('Failed to initialize channel state:', error);
  }
}

/**
 * Saves current channels list to localStorage
 */
function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
  } catch (error) {
    console.error('Failed to write to localStorage:', error);
  }
}

/**
 * Syncs the channels array to localStorage and window URL
 */
function syncState() {
  saveToStorage();

  // Sync to URL search parameters
  try {
    const url = new URL(window.location.href);
    if (channels.length > 0) {
      url.searchParams.set('channels', channels.join(','));
    } else {
      url.searchParams.delete('channels');
    }
    // Update history without page reload
    window.history.replaceState({}, '', url.pathname + url.search);
  } catch (error) {
    console.warn('Failed to update URL search parameters:', error);
  }
}

/**
 * Notifies all registered listeners of a change in state
 * @param {string} action - 'add' or 'remove'
 * @param {string} channel - Channel nickname
 */
function notify(action, channel) {
  listeners.forEach(cb => {
    try {
      cb([...channels], action, channel);
    } catch (e) {
      console.error('Error in state listener callback:', e);
    }
  });
}

/**
 * Returns a copy of the current active channels
 * @returns {string[]}
 */
export function getChannels() {
  return [...channels];
}

/**
 * Adds a channel nickname to the state if it doesn't exist
 * @param {string} nick - Normalized channel name
 * @returns {boolean} True if successfully added
 */
export function addChannel(nick) {
  if (!nick || channels.includes(nick)) {
    return false;
  }
  
  channels.push(nick);
  syncState();
  notify('add', nick);
  return true;
}

/**
 * Removes a channel nickname from the state
 * @param {string} nick - Channel name to remove
 * @returns {boolean} True if successfully removed
 */
export function removeChannel(nick) {
  const index = channels.indexOf(nick);
  if (index === -1) {
    return false;
  }

  channels.splice(index, 1);
  syncState();
  notify('remove', nick);
  return true;
}

/**
 * Registers a callback to be executed whenever the channel list changes
 * @param {function} callback - Receives (currentChannels, actionType, channelName)
 */
export function onChannelsChange(callback) {
  if (typeof callback === 'function') {
    listeners.push(callback);
  }
}

// Run state initialization on module load
init();
