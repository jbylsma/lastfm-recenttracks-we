'use strict';

const DEFAULT_SETTINGS = {
    'apiKey': '',
    'fetchLimit': 10,
    'users': ''
};

const LASTFM_API_URL = 'http://ws.audioscrobbler.com/2.0/';

// Populate missing default settings on startup.
const gettingStoredSettings = browser.storage.local.get();
gettingStoredSettings.then((settings) => {
    for (let prop in DEFAULT_SETTINGS) {
        if (!settings[prop]) {
            browser.storage.local.set(DEFAULT_SETTINGS);
            break;
        }
    }
});

/**
 * Wrapper for sending successful messages.
 *
 * @param data Any relevant data for the successful message.
 */
function sendSuccess(data = {}) {
    browser.runtime.sendMessage({
        status: 'success',
        data: data,
    });
}

/**
 * Wrapper for sending error messages.
 *
 * @param name The shortname of the error.
 * @param data Any relevant data for the error.
 */
function sendError(name, data = {}) {
    browser.runtime.sendMessage({
        status: 'error',
        name: name,
        data: data,
    });
}


/**
 * Get users' recent tracks.
 */
function getRecentTracks(storedSettings) {
    // TODO: How to handle settings changes.
    // TODO: Only check every X minutes, cache results.
    // TODO: Locking system?
    // TODO: Handle multiple users

    if (storedSettings['apiKey'].trim().length === 0) {
        sendError('settingsApiKey');
        return;
    }

    if (storedSettings['users'].trim().length === 0) {
        sendError('settingsUsers');
        return;
    }

    let url = LASTFM_API_URL +
        '?method=user.getrecenttracks' +
        '&api_key=' + encodeURIComponent(storedSettings['apiKey']) +
        '&user=' + encodeURIComponent(storedSettings['users']) +
        '&limit=' + encodeURIComponent(storedSettings['fetchLimit']) +
        '&format=json';

    let xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onreadystatechange = function() {
        if (this.readyState === 4) {
            if (this.status === 200) {
                sendSuccess(JSON.parse(xhr.response));
            }
            else {
                sendError('apiFail', xhr);
            }
        }
    };
    xhr.onabort = xhr.onerror = function() {
        sendError('xhrFail', xhr);
    };
    xhr.send();
}

// Listen for messages from the options and newtab pages.
browser.runtime.onMessage.addListener((action) => {
    switch (action) {
        case 'getRecentTracks':
            const gettingStoredSettings = browser.storage.local.get();
            gettingStoredSettings.then(getRecentTracks);
            break;

        default:
            console.error('No action found: %s', action);
    }
});