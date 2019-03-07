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

// Module for caching API responses and sending message.
let responseCache = (function() {
    let module = {};
    let response = {};

    module.sendMessage = function() {
        if (response.hasOwnProperty('status')) {
            browser.runtime.sendMessage(response);
        }
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
 * Get users' recent tracks.
 */
function getRecentTracks() {
    // TODO: How to handle settings changes.

    const gettingStoredSettings = browser.storage.local.get();
    gettingStoredSettings.then(function(storedSettings) {
        if (storedSettings['apiKey'].trim().length === 0) {
            responseCache.setError('settingsApiKey');
            return;
        }

        if (storedSettings['users'].trim().length === 0) {
            responseCache.setError('settingsUsers');
            return;
        }

        let users = storedSettings['users'].split(';');

        let requests = [];
        users.forEach(function(user) {
            requests.push(getRecentTracksForUser(user.trim(), storedSettings['apiKey'], storedSettings['fetchLimit']));
        });

        // Promise.all() returns all promises in the specified order, so no transforming necessary.
        Promise.all(requests).then(function(responses) {
            responseCache.setSuccess(responses);
        })
    });
}

/**
 * Fetches recent tracks for the given last.fm user

 * @param user username of the last.fm user in question
 * @param apiKey key used to connect to last.fm API
 * @param fetchLimit integer value of how many tracks to fetch
 */
function getRecentTracksForUser(user, apiKey, fetchLimit) {
    return new Promise(function(resolve) {
        let url = LASTFM_API_URL +
            '?method=user.getrecenttracks' +
            '&api_key=' + encodeURIComponent(apiKey) +
            '&user=' + encodeURIComponent(user) +
            '&limit=' + encodeURIComponent(fetchLimit) +
            '&format=json';

        let xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.onreadystatechange = function () {
            if (this.readyState !== 4) {
                return;
            }

            let response = {
                status: xhr.status,
                statusText: xhr.statusText,
                response: null
            };

            try {
                if (xhr.response.trim().length > 0) {
                    response.response = JSON.parse(xhr.response);
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

// Listen for messages from the options and newtab pages.
browser.runtime.onMessage.addListener((action) => {
    switch (action) {
        case 'getRecentTracks':
            responseCache.sendMessage();
            break;

        default:
            console.error('No action found: %s', action);
    }
});

/**
 * Sets up an Alarm to sleep for ~91 seconds before checking for recent tracks again
 * (the length of The Beatles' "Golden Slumbers")
 */
browser.alarms.onAlarm.addListener((alarm) => {
    switch(alarm.name) {
        case 'pollForRecentTracks':
            getRecentTracks();
            break;

        default:
            console.error('No alarm found: %s', alarm.name);
    }

});
// TODO: Don't set up polling unless API Key and Users are set.
browser.alarms.create("pollForRecentTracks", {periodInMinutes: 1.5167});

// Kick out the scrobs, mother father.
getRecentTracks();
