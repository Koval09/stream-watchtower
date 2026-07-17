// Twitch Player Management Module

// Keep track of active player instances
// Key: channel nickname (normalized, lowercase), Value: Twitch.Player instance
const players = new Map();

/**
 * Creates a Twitch Player in the specified container.
 * @param {string} channel - Channel nickname (lowercase)
 * @param {HTMLElement} container - The DOM element to embed the player iframe in
 * @returns {Twitch.Player} The created player instance
 */
export function createPlayer(channel, container) {
  if (players.has(channel)) {
    return players.get(channel);
  }

  // Determine parent hostname for security/embedding context
  // location.hostname is empty on file:// protocol, so we fallback to a safe option or localhost
  const hostname = window.location.hostname || 'localhost';

  const options = {
    channel: channel,
    width: '100%',
    height: '100%',
    parent: [hostname],
    muted: true,
    autoplay: true
  };

  try {
    const player = new Twitch.Player(container, options);
    players.set(channel, player);
    return player;
  } catch (error) {
    console.error(`Failed to create Twitch player for channel "${channel}":`, error);
    return null;
  }
}

/**
 * Destroys a Twitch Player instance and cleans up its references.
 * @param {string} channel - Channel nickname (lowercase)
 */
export function destroyPlayer(channel) {
  const player = players.get(channel);
  if (player) {
    try {
      // Twitch Embed Player API provides a destroy() method to clean up resources
      if (typeof player.destroy === 'function') {
        player.destroy();
      }
    } catch (error) {
      console.error(`Error destroying player for channel "${channel}":`, error);
    }
    players.delete(channel);
  }
}

/**
 * Gets a player instance if it exists.
 * @param {string} channel - Channel nickname (lowercase)
 * @returns {Twitch.Player|undefined}
 */
export function getPlayer(channel) {
  return players.get(channel);
}

/**
 * Gets all active player instances.
 * @returns {Map<string, Twitch.Player>}
 */
export function getAllPlayers() {
  return players;
}
