'use strict';

/**
 * Save extension settings.
 */
function saveSettings() {
    let settings = {};
    document.querySelectorAll('form input:not([type="submit"])').forEach((element) => {
        let id;
        id = element.getAttribute('id');
        settings[id] = element.value;
    });

    browser.storage.local.set(settings)
        .then(browser.runtime.sendMessage('resetPolling'));
}

/**
 * Update form fields with extension settings.
 * @param settings
 */
function updateUI(settings) {
    for (let prop in settings) {
        if (settings.hasOwnProperty(prop)) {
            document.querySelector('#' + prop).value = settings[prop];
        }
    }
}

const settings = browser.storage.local.get();
settings.then(updateUI);

const saveButton = document.querySelector('input[type=button]');
saveButton.addEventListener('click', saveSettings);