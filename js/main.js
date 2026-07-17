import { createPlayer, destroyPlayer } from './players.js';
import { getChannels, addChannel, removeChannel, onChannelsChange } from './state.js';

const form = document.getElementById('add-channel-form');
const input = document.getElementById('channel-input');
const tilesContainer = document.getElementById('tiles');
const emptyState = document.getElementById('empty-state');

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

  // Header element
  const header = document.createElement('div');
  header.className = 'tile-header';

  const nameSpan = document.createElement('span');
  nameSpan.className = 'channel-name';
  nameSpan.textContent = nick;
  header.appendChild(nameSpan);

  // Actions wrapper
  const actions = document.createElement('div');
  actions.className = 'tile-actions';

  // Sound/Mute Button (placeholder functionality for Stage 1 & 2)
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

// Listen for state changes (pub/sub synchronization)
onChannelsChange((currentChannels, action, channel) => {
  if (action === 'add') {
    renderTile(channel);
  } else if (action === 'remove') {
    const tile = tilesContainer.querySelector(`.tile[data-channel="${channel}"]`);
    if (tile) {
      tile.remove();
    }
  }
  updateEmptyState(currentChannels);
});

// Initial load (restore state from URL or localStorage)
const initialChannels = getChannels();
initialChannels.forEach(nick => renderTile(nick));
updateEmptyState(initialChannels);
