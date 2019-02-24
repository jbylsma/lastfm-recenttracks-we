'use strict';

let main = document.querySelector('main');

// Plain-text descriptions for possible error messages.
const ERROR_DESCRIPTIONS = {
    settingsApiKey: 'The Last.fm API Key has not been set.',
    settingsUsers: 'The Last.fm users have not been set.',
    apiFail: 'The connection failed to the Last.fm API.',
    xhrFail: 'Could not create a connection to Last.fm API.',
};

// Listen for messages from background Javascript.
browser.runtime.onMessage.addListener((message) => {
    main.textContent = '';

    if (message.status === 'success') {
        // TODO: Format and output data.
        console.log('success');
        console.log(message);
        console.log(message.data);
    }
    else {
        console.log('error');
        console.log(message);
        let errorDescription = ERROR_DESCRIPTIONS[message.name];

        // Handle missing settings.
        if (message.name.startsWith('settings')) {
            let optionsLink = document.createElement('a');
            optionsLink.textContent = errorDescription;
            optionsLink.setAttribute('href', '');

            optionsLink.addEventListener('click', function() {
                browser.runtime.openOptionsPage();
                return false;
            });

            main.appendChild(optionsLink);
        }
    }
});

// TODO: Run constantly, not just on load.
browser.runtime.sendMessage('getRecentTracks');
