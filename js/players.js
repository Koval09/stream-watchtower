// Twitch Player Management Module

// Keep track of active player instances
// Key: channel nickname (lowercase), Value: Twitch.Player instance
const players = new Map();

// Track which player instances are fully loaded and ready
const readyPlayers = new Set();

// Lock flag to prevent infinite loops during audio state synchronization
let isSyncingAudio = false;

// Track the currently unmuted channel name to avoid redundant changes and event loops
let currentUnmutedChannel = null;

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

  const hostname = window.location.hostname || 'localhost';

  const options = {
    channel: channel,
    width: '100%',
    height: '100%',
    parent: [hostname],
    muted: true, // Default to muted to prevent autoplay blocks
    autoplay: true
  };

  try {
    const player = new Twitch.Player(container, options);
    players.set(channel, player);

    // Event: Player Ready
    player.addEventListener(Twitch.Player.READY, () => {
      console.log(`[Player] READY event for: ${channel}`);
      readyPlayers.add(channel);
      
      try {
        player.play();
      } catch (err) {
        console.warn(`[Player] Failed to play on READY for ${channel}:`, err);
      }
    });

    // Event: Playback Start
    player.addEventListener(Twitch.Player.PLAY, () => {
      console.log(`[Player] PLAY event for: ${channel}`);
      readyPlayers.add(channel);
    });

    // Event: Playback Paused
    player.addEventListener(Twitch.Player.PAUSE, () => {
      console.log(`[Player] PAUSE event for: ${channel}`);
    });

    // Event: Playback Blocked (browser blocked autoplay with sound)
    player.addEventListener(Twitch.Player.PLAYBACK_BLOCKED, () => {
      console.warn(`[Player] PLAYBACK_BLOCKED event for: ${channel}`);
      showPlaybackBlockedHint(channel);
    });

    // Event: User unmuted the stream inside the Twitch Player UI
    player.addEventListener(Twitch.Player.UNMUTE, () => {
      console.log(`[Player] User unmuted ${channel} inside Twitch iframe controls`);
      // Update UI and mute other streams to maintain exclusive sound
      setAudioTo(channel);
    });

    // Event: User muted the stream inside the Twitch Player UI
    player.addEventListener(Twitch.Player.MUTE, () => {
      console.log(`[Player] User muted ${channel} inside Twitch iframe controls`);
      
      // Sync our custom header button if it was active
      if (!isSyncingAudio) {
        const tile = document.querySelector(`.tile[data-channel="${channel}"]`);
        const muteBtn = tile?.querySelector('.mute-btn');
        if (muteBtn && muteBtn.classList.contains('unmuted')) {
          muteBtn.innerHTML = '🔇';
          muteBtn.classList.remove('unmuted');
          muteBtn.title = 'Unmute (exclusive)';
        }
      }
    });

    // Event: Channel goes offline
    player.addEventListener(Twitch.Player.OFFLINE, () => {
      console.log(`[Player] OFFLINE event for: ${channel}`);
      toggleOfflineBadge(channel, true);
    });

    // Event: Channel goes online
    player.addEventListener(Twitch.Player.ONLINE, () => {
      console.log(`[Player] ONLINE event for: ${channel}`);
      toggleOfflineBadge(channel, false);
    });

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
      if (typeof player.destroy === 'function') {
        player.destroy();
      }
    } catch (error) {
      console.error(`Error destroying player for channel "${channel}":`, error);
    }
    players.delete(channel);
    readyPlayers.delete(channel);
    if (currentUnmutedChannel === channel) {
      currentUnmutedChannel = null;
    }
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

/**
 * Sets audio to the specified channel exclusively (unmutes it, mutes all others).
 * If targetNick is null, mutes all channels.
 * Uses a small delay before triggering play/unmute commands to ensure the browser has
 * finished CSS layout transitions and resized the iframe properly.
 * @param {string|null} targetNick - Channel nickname to unmute
 */
export function setAudioTo(targetNick) {
  if (targetNick === currentUnmutedChannel) {
    return;
  }
  
  if (isSyncingAudio) return;
  isSyncingAudio = true;
  
  currentUnmutedChannel = targetNick;
  console.log(`[Audio] Switching audio exclusively to: ${targetNick}`);
  
  players.forEach((player, channel) => {
    const tile = document.querySelector(`.tile[data-channel="${channel}"]`);
    const muteBtn = tile?.querySelector('.mute-btn');
    
    // Clear playback blocked hints since user is interacting with audio
    const existingHint = tile?.querySelector('.playback-blocked-hint');
    if (existingHint) {
      existingHint.remove();
    }

    try {
      if (channel === targetNick) {
        // Set muted and play immediately to preserve user gesture context
        player.setMuted(false);
        player.play();
        console.log(`[Audio] Unmuted and played (synchronous): ${channel}`);

        if (muteBtn) {
          muteBtn.innerHTML = '🔊';
          muteBtn.classList.add('unmuted');
          muteBtn.title = 'Mute';
        }
      } else {
        // Mute other streams immediately
        player.setMuted(true);
        player.play(); // Keep background streams playing (muted)

        if (muteBtn) {
          muteBtn.innerHTML = '🔇';
          muteBtn.classList.remove('unmuted');
          muteBtn.title = 'Unmute (exclusive)';
        }
      }
    } catch (error) {
      console.warn(`Error setting mute/play status for ${channel}:`, error);
    }
  });

  isSyncingAudio = false;
}

/**
 * Quality updating is handled automatically by Twitch.
 * Keeping the export for compatibility with main.js calls.
 */
export function updateQualities() {
  console.log('[Quality] Automatically managed by Twitch (Auto quality mode)');
}

/**
 * Displays a warning badge if audio playback was blocked by browser autoplay rules.
 * @param {string} channel 
 */
function showPlaybackBlockedHint(channel) {
  const tile = document.querySelector(`.tile[data-channel="${channel}"]`);
  if (!tile) return;

  // Don't duplicate hints
  if (tile.querySelector('.playback-blocked-hint')) return;

  const hint = document.createElement('div');
  hint.className = 'playback-blocked-hint';
  hint.textContent = 'Click to enable audio / Кликните для включения звука';

  // Enable audio when the user clicks the warning hint
  hint.addEventListener('click', (e) => {
    e.stopPropagation();
    const player = players.get(channel);
    if (player) {
      try {
        player.setMuted(false);
        // Sync indicator
        setAudioTo(channel);
      } catch (err) {
        console.warn('Failed to unmute after click:', err);
      }
    }
    hint.remove();
  });

  tile.appendChild(hint);
}

/**
 * Toggles the "OFFLINE" status badge on a channel tile.
 * @param {string} channel 
 * @param {boolean} isOffline 
 */
function toggleOfflineBadge(channel, isOffline) {
  const tile = document.querySelector(`.tile[data-channel="${channel}"]`);
  if (!tile) return;

  const existingBadge = tile.querySelector('.offline-badge');
  if (isOffline) {
    if (!existingBadge) {
      const badge = document.createElement('div');
      badge.className = 'offline-badge';
      badge.textContent = 'OFFLINE';
      tile.appendChild(badge);
    }
  } else {
    if (existingBadge) {
      existingBadge.remove();
    }
  }
}
