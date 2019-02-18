'use strict';

const defaultSettings = {
    'apiKey': '',
    'fetchLimit': 10
};

/*
On startup, check whether we have stored settings.
If we don't, then stor2e the default settings.
*/
function checkStoredSettings(storedSettings) {
    if (!storedSettings.apiKey || !storedSettings.fetchLimit) {
        browser.storage.local.set(defaultSettings);
    }
}

const gettingStoredSettings = browser.storage.local.get();
gettingStoredSettings.then(checkStoredSettings);
