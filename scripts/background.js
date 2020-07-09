'use strict';

const DEFAULT_SETTINGS = {
    'apiKey': '',
    'fetchLimit': 10,
    'users': ''
};

const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';

// Poll period for recent tracks period.
// ~91 seconds (the length of The Beatles' "Golden Slumbers")
const POLLING_DELAY = 1.5167;

// Module for caching API responses and sending message.
let responseCache = (function() {
    let module = {};
    let response = {};

    module.reset = function() {
        response = {};
    }

    module.sendMessage = function() {
        // Sanity check the responses.
        if (!response.hasOwnProperty('status')) {
            return;
        }

        browser.runtime.sendMessage(response).catch(() => {
            // No-op. Updating preferences without a newtab page open will cause a "Error: Could not establish
            // connection. Receiving end does not exist." error.
        });
    };

    module.setSuccess = function(responses) {
        response = {
            status: 'success',
            responses: responses
        };
        module.sendMessage();
    };

    module.setError = function(name) {
        response = {
            status: 'error',
            name: name
        };
        module.sendMessage();
    };

    return module;
}());

/**
 * Get the extension settings.
 */
function getSettings() {
    let storedSettings = browser.storage.local.get();

    return storedSettings.then(settings => {
        // Populate missing settings.
        let updateStoredSettings = false;
        for (let prop in DEFAULT_SETTINGS) {
            if (!settings.hasOwnProperty(prop)) {
                settings[prop] = DEFAULT_SETTINGS[prop];
                updateStoredSettings = true;
            }
        }

        if (updateStoredSettings) {
            browser.storage.local.set(settings);
        }

        return settings;
    });
}

/**
 * Get users' recent tracks.
 */
function getRecentTracks() {
    getSettings().then(settings => {
        let users = settings['users'].split(';');

        let requests = [];
        users.forEach(user => {
            let apiKey = settings['apiKey'];
            let fetchLimit = settings['fetchLimit'];
            user = user.trim();

            requests.push(getRecentTracksForUser(user, apiKey, fetchLimit));
        });

        // Promise.all() returns all promises in the specified order, so no transforming necessary.
        Promise.all(requests).then(function(responses) {
            responseCache.setSuccess(responses);
        })
    });
}

/**
 * Fetches recent tracks for the given last.fm user.
 *
 * @param user The last.fm username, case insensitive.
 * @param apiKey Key used to connect to last.fm API.
 * @param fetchLimit Integer value of how many tracks to fetch.
 */
function getRecentTracksForUser(user, apiKey, fetchLimit) {
    return new Promise(function(resolve) {
        let url = LASTFM_API_URL +
            '?method=user.getrecenttracks' +
            '&api_key=' + encodeURIComponent(apiKey) +
            '&user=' + encodeURIComponent(user) +
            '&limit=' + encodeURIComponent(fetchLimit) +
            '&extended=1' +
            '&format=json';

        let xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.onreadystatechange = function () {
            // Only process completed requests.
            if (this.readyState !== 4) {
                return;
            }

            let response = {
                user: user,
                status: xhr.status,
                statusText: xhr.statusText,
                data: null
            };

            try {
                if (xhr.response.trim().length > 0) {
                    response.data = JSON.parse(xhr.response);
                }
            }
            catch (e) {
                console.error("Couldn't parse JSON response", xhr.response);
            }

            resolve(response);
        };
        xhr.send();
    });
}

/**
 * Initialize application.
 */
function initialize() {
    let settings = getSettings();
    settings.then(settings => {
        if (settings['apiKey'].trim().length === 0) {
            responseCache.setError('settingsApiKey');
            return;
        }

        if (settings['users'].trim().length === 0) {
            responseCache.setError('settingsUsers');
            return;
        }

        // Settings are all OK, set up application.
        setupPolling();
        browser.alarms.onAlarm.addListener(alarmListener);
        browser.runtime.onMessage.addListener(resetPollingListener);
        getRecentTracks();
    })
}

/**
 * Teardown application.
 */
function teardown() {
    responseCache.reset();
    teardownPolling();
    browser.alarms.onAlarm.removeListener(alarmListener);
    browser.runtime.onMessage.removeListener(resetPollingListener);
}

/**
 * Set up periodic polling for recent tracks.
 */
function setupPolling() {
    return browser.alarms.create('pollForRecentTracks', {
        periodInMinutes: POLLING_DELAY,
    });
}

/**
 * Tear down periodic polling.
 */
function teardownPolling() {
    return browser.alarms.clear('pollForRecentTracks');
}

/**
 * Listener for polling alarms.
 *
 * @param alarm The alarm name to listen for.
 */
function alarmListener(alarm) {
    if (alarm.name === 'pollForRecentTracks') {
        getRecentTracks();
    } else {
        console.error('No alarm found: %s', alarm.name);
    }
}

/**
 * Listener for resetPolling
 * @param message The message
 */
function resetPollingListener(message) {
   if (message === 'resetPolling') {
       teardownPolling()
           .then(setupPolling)
           .then(getRecentTracks)
   }
}

// Listen for messages from the options and newtab pages.
browser.runtime.onMessage.addListener(message => {
    switch (message) {
        case 'getRecentTracks':
            responseCache.sendMessage();
            break;

        case 'reinitialize':
            teardown();
            initialize();
            break;
    }
});

// Kick out the scrobs, mother father.
initialize();