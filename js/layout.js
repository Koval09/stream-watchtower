// Layout Management Module (Grid mode vs Focus mode)

let focusedChannel = null;

/**
 * Returns the currently focused channel name, or null if in grid mode.
 * @returns {string|null}
 */
export function getFocusedChannel() {
  return focusedChannel;
}

/**
 * Checks if Focus Mode is active.
 * @returns {boolean}
 */
export function isFocusModeActive() {
  return focusedChannel !== null;
}

/**
 * Enters focus mode for the specified channel.
 * Updates DOM classes and loads the Twitch Chat iframe.
 * @param {string} nick - The channel nickname to focus
 */
export function enterFocus(nick) {
  focusedChannel = nick;

  const tilesContainer = document.getElementById('tiles');
  const chatContainer = document.getElementById('chat-container');
  const backBtn = document.getElementById('back-to-grid-btn');

  // Add layout class to the main tiles container
  tilesContainer.classList.add('focus-layout');
  
  // Reset horizontal scroll position
  tilesContainer.scrollLeft = 0;
  tilesContainer.style.setProperty('--scroll-left', '0px');

  // Show the "Back to Grid" button in the topbar
  backBtn.classList.remove('hidden');

  // Update classes on each tile
  const tiles = tilesContainer.querySelectorAll('.tile');
  tiles.forEach(tile => {
    const channel = tile.getAttribute('data-channel');
    if (channel === nick) {
      tile.classList.add('focused');
      tile.classList.remove('mini');
    } else {
      tile.classList.add('mini');
      tile.classList.remove('focused');
    }
  });

  // Load the chat iframe for the focused channel
  const hostname = window.location.hostname || 'localhost';
  chatContainer.innerHTML = `<iframe src="https://www.twitch.tv/embed/${nick}/chat?parent=${hostname}&darkpopout" height="100%" width="100%"></iframe>`;
  chatContainer.classList.remove('hidden');
}

/**
 * Exits focus mode and returns to Grid mode.
 * Resets DOM classes and removes the chat iframe.
 */
export function exitFocus() {
  focusedChannel = null;

  const tilesContainer = document.getElementById('tiles');
  const chatContainer = document.getElementById('chat-container');
  const backBtn = document.getElementById('back-to-grid-btn');

  // Remove layout classes
  tilesContainer.classList.remove('focus-layout');
  tilesContainer.style.removeProperty('--scroll-left');

  // Hide the back button
  backBtn.classList.add('hidden');

  // Remove focus/mini states from all tiles
  const tiles = tilesContainer.querySelectorAll('.tile');
  tiles.forEach(tile => {
    tile.classList.remove('focused', 'mini');
  });

  // Hide and clean up the chat container to stop loading the iframe
  chatContainer.classList.add('hidden');
  chatContainer.innerHTML = '';
}
