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
 * Sets up an Alarm to sleep for ~91 seconds before checking for recent tracks again
 * (the length of The Beatles' "Golden Slumbers")
 */
function setUpPolling() {

    browser.alarms.onAlarm.addListener((alarm) => {
        switch(alarm.name) {
            case 'pollForRecentTracks':
                const gettingStoredSettings = browser.storage.local.get();
                gettingStoredSettings.then(getRecentTracks);
                break;

        default:
            console.error('No alarm found: %s', alarm.name);
        }

    });

    browser.alarms.create("pollForRecentTracks", {periodInMinutes: 1.5167});
}

/**
 * Get users' recent tracks.
 */
function getRecentTracks(storedSettings) {
    // TODO: How to handle settings changes.
    // TODO: Cache results?  (do we need to if we poll?)
    // TODO: Locking system?
    // TODO: Display of multiple users jumps around (House of Pain style) - stop it somehow.

    if (storedSettings['apiKey'].trim().length === 0) {
        sendError('settingsApiKey');
        return;
    }

    if (storedSettings['users'].trim().length === 0) {
        sendError('settingsUsers');
        return;
    }

    let users = storedSettings['users'];

    // if we have a semi-colon, we've got multiple users to deal with
    if (users.indexOf(';') > 0) {
        users = users.split(";");
    }

    // loop through all of our users and fetch those tracks
    for (var i=0; i < users.length; i++) {
        let userName = users[i].trim();
        getRecentTracksForUser(userName, storedSettings['apiKey'], storedSettings['fetchLimit']);
    }
}

/**
 * Fetches recent tracks for the given last.fm user

 * @param user username of the last.fm user in question
 * @param apiKey key used to connect to last.fm API
 * @param fetchLimit integer value of how many tracks to fetch
 */
function getRecentTracksForUser(user, apiKey, fetchLimit) {
    let url = LASTFM_API_URL +
        '?method=user.getrecenttracks' +
        '&api_key=' + encodeURIComponent(apiKey) +
        '&user=' + encodeURIComponent(user) +
        '&limit=' + encodeURIComponent(fetchLimit) +
        '&format=json';

    let xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onreadystatechange = function() {
        if (this.readyState !== 4) {
            return;
        }

        if (this.status === 200) {
            sendSuccess(JSON.parse(xhr.response));
        }
        else {
            // Bad requests return status 0.
            sendError('apiFail', {
                status: this.status,
                statusText: this.statusText,
            });
        }
    };
    xhr.send();
}

// Listen for messages from the options and newtab pages.
browser.runtime.onMessage.addListener((action) => {
    switch (action) {
        case 'getRecentTracks':
            const gettingStoredSettings = browser.storage.local.get();
            gettingStoredSettings
                .then(getRecentTracks)      // get recent tracks right away
                .then(setUpPolling);        // then set up polling so those recent tracks stay recent
            break;

        default:
            console.error('No action found: %s', action);
    }
});