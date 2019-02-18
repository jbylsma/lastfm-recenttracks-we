'use strict';

function storeSettings() {
    browser.storage.local.set({
        apiKey: document.querySelector('#apiKey').value,
        fetchLimit: document.querySelector('#fetchLimit').value,
    });
}

function updateUI(restoredSettings) {
    document.querySelector('#apiKey').value = restoredSettings.apiKey;
    document.querySelector('#fetchLimit').value = restoredSettings.fetchLimit;
}


const gettingStoredSettings = browser.storage.local.get();
gettingStoredSettings.then(updateUI);

const saveButton = document.querySelector("#save-button");
saveButton.addEventListener("click", storeSettings);