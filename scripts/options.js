'use strict';

/**
 * Save extension settings.
 */
function saveSettings(e) {
    // TODO: Move outside function
    const alert = document.querySelector('#alert');
    let settings = {};

    document.querySelectorAll('form .option input').forEach((element) => {
        let id;
        id = element.getAttribute('id');
        settings[id] = element.value;
    });

    browser.storage.local.set(settings)
        .then(() => {
            return browser.runtime.sendMessage('resetPolling');
        }, reason => {
            console.error(reason);
        })
        .then(() => {
            // TODO: Make more pretty
            alert.textContent = 'Settings saved, polling reset';
            alert.style.display = 'block';
            setTimeout(() => {
                alert.style.display = 'none';
                alert.textContent = '';
            }, 2000);

        });

    e.preventDefault();
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

// HTML has all inputs as disabled and JS enables them. Prevents a JS error showing editable fields.
document.querySelectorAll('input')
    .forEach((input) => {
        input.disabled = false;
    });

const saveButton = document.querySelector('input[type=submit]');
saveButton.addEventListener('click', saveSettings);