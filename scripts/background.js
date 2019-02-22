'use strict';

const DEFAULT_SETTINGS = {
    'apiKey': '',
    'fetchLimit': 10,
    'users': ''
};

const UPDATE_INTERVAL= 120;

// Populate missing default settings on startup.
let settings = browser.storage.local.get();

settings.then((settings) => {
    for (let prop in DEFAULT_SETTINGS) {
        if (!settings[prop]) {
            browser.storage.local.set(DEFAULT_SETTINGS);
            break;
        }
    }
});
