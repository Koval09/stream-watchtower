import { createPlayer, destroyPlayer } from './players.js';
import { getChannels, addChannel, removeChannel, onChannelsChange } from './state.js';
import { enterFocus, exitFocus, isFocusModeActive, getFocusedChannel } from './layout.js';

const form = document.getElementById('add-channel-form');
const input = document.getElementById('channel-input');
const tilesContainer = document.getElementById('tiles');
const emptyState = document.getElementById('empty-state');
const backBtn = document.getElementById('back-to-grid-btn');

/**
 * Normalizes input: extracts channel username from URL, trims, converts to lowercase
 * @param {string} rawInput 
 * @returns {string} Clean channel username
 */
function extractChannelName(rawInput) {
  let val = rawInput.trim().toLowerCase();
  if (!val) return '';

  try {
    if (val.includes('twitch.tv/')) {
      const parts = val.split('twitch.tv/');
      if (parts.length > 1) {
        // Strip everything after twitch.tv/ username (chat, query params, etc)
        const pathSegment = parts[1].split('/')[0].split('?')[0];
        val = pathSegment;
      }
    }
  } catch (error) {
    console.error('Error parsing twitch URL:', error);
  }

  // Twitch username constraints: 3-25 alphanumeric characters and underscores
  return val.replace(/[^a-z0-9_]/g, '');
}

/**
 * Updates the empty state container visibility based on active channels
 * @param {string[]} currentChannels 
 */
function updateEmptyState(currentChannels) {
  if (currentChannels.length === 0) {
    emptyState.classList.remove('hidden');
    tilesContainer.classList.add('hidden');
  } else {
    emptyState.classList.add('hidden');
    tilesContainer.classList.remove('hidden');
  }
}

/**
 * Creates and renders the HTML structure for a stream tile
 * @param {string} nick 
 */
function renderTile(nick) {
  const tile = document.createElement('div');
  tile.className = 'tile';
  tile.setAttribute('data-channel', nick);

  // If focus mode is already active, new tiles start as mini-windows
  if (isFocusModeActive()) {
    tile.classList.add('mini');
  }

  // Header element
  const header = document.createElement('div');
  header.className = 'tile-header';
  
  // Clicking header opens focus mode (or switches focus)
  header.addEventListener('click', (e) => {
    e.stopPropagation();
    enterFocus(nick);
  });

  const nameSpan = document.createElement('span');
  nameSpan.className = 'channel-name';
  nameSpan.textContent = nick;
  header.appendChild(nameSpan);

  // Actions wrapper
  const actions = document.createElement('div');
  actions.className = 'tile-actions';

  // Sound/Mute Button (placeholder functionality for Stage 3)
  const muteBtn = document.createElement('button');
  muteBtn.className = 'tile-btn mute-btn';
  muteBtn.title = 'Mute/Unmute';
  muteBtn.innerHTML = '🔇';
  actions.appendChild(muteBtn);

  // Close Button (✕)
  const closeBtn = document.createElement('button');
  closeBtn.className = 'tile-btn close-btn';
  closeBtn.title = 'Close stream';
  closeBtn.innerHTML = '✕';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeChannel(nick);
  });
  actions.appendChild(closeBtn);

  header.appendChild(actions);
  tile.appendChild(header);

  // Player DOM Container
  const playerContainer = document.createElement('div');
  playerContainer.className = 'tile-player-container';
  playerContainer.id = `player-container-${nick}`;
  tile.appendChild(playerContainer);

  // Switch focus if clicking on a mini-tile in Focus mode
  tile.addEventListener('click', () => {
    if (isFocusModeActive() && tile.classList.contains('mini')) {
      enterFocus(nick);
    }
  });

  tilesContainer.appendChild(tile);

  // Initialize Twitch Player in container
  createPlayer(nick, playerContainer);
}

// Wire up Form Submission
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const rawInput = input.value;
  const nick = extractChannelName(rawInput);
  if (nick) {
    addChannel(nick);
  }
  input.value = '';
});

// Wire up Quick Example Buttons
document.querySelectorAll('.example-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const channel = btn.getAttribute('data-channel');
    if (channel) {
      addChannel(channel);
    }
  });
});

// Wire up "Back to Grid" button
backBtn.addEventListener('click', () => {
  exitFocus();
});

// Sync absolute position of focused tile with horizontal scrolling of mini tiles
tilesContainer.addEventListener('scroll', () => {
  if (isFocusModeActive()) {
    tilesContainer.style.setProperty('--scroll-left', `${tilesContainer.scrollLeft}px`);
  }
});

// Listen for state changes (pub/sub synchronization)
onChannelsChange((currentChannels, action, channel) => {
  if (action === 'add') {
    renderTile(channel);
  } else if (action === 'remove') {
    const tile = tilesContainer.querySelector(`.tile[data-channel="${channel}"]`);
    if (tile) {
      tile.remove();
    }
    // If the currently focused channel is removed, exit focus mode
    if (channel === getFocusedChannel()) {
      exitFocus();
    }
  }
  updateEmptyState(currentChannels);
});

// Keyboard Shortcuts (Hotkeys)
window.addEventListener('keydown', (e) => {
  // Disable hotkeys when user is actively typing in inputs
  if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
    return;
  }

  if (e.key === 'Escape') {
    if (isFocusModeActive()) {
      exitFocus();
    }
  } else if (e.key >= '1' && e.key <= '9') {
    const index = parseInt(e.key, 10) - 1;
    const channelsList = getChannels();
    if (index < channelsList.length) {
      enterFocus(channelsList[index]);
    }
  }
});

// Initial load (restore state from URL or localStorage)
const initialChannels = getChannels();
initialChannels.forEach(nick => renderTile(nick));
updateEmptyState(initialChannels);
