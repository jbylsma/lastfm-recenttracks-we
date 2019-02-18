'use strict';

let options = new Map([
    ['apiKey', ''],
    ['fetchLimit', 10]
]);

function saveOptions(e) {
    let value = {};
    options.forEach(function(defaultValue, key) {
        value[key] = document.querySelector('#' + key).value;

    });
    browser.storage.local.set(value);
    e.preventDefault();
}

function restoreOptions() {
    options.forEach(function(defaultValue, key) {
        let storageItem = browser.storage.local.get(key);

        storageItem.then((res) => {
            document.querySelector('#' + key).value = res[key] || defaultValue;
        });
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);