'use strict';

let main = document.querySelector('main');

// Plain-text descriptions for possible error messages.
const ERROR_DESCRIPTIONS = {
    settingsApiKey: 'The Last.fm API Key has not been set.',
    settingsUsers: 'The Last.fm users have not been set.',
    apiFail: 'The Last.fm API request failed.',
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
        let errorParagraph = document.createElement('p');

        switch (message.name) {
            case 'settingsApiKey':
            case 'settingsUsers':
                let optionsLink = document.createElement('a');
                optionsLink.textContent = ERROR_DESCRIPTIONS[message.name];
                optionsLink.setAttribute('href', '');

                optionsLink.addEventListener('click', function() {
                    browser.runtime.openOptionsPage();
                    return false;
                });
                errorParagraph.appendChild(optionsLink);
                break;

            case 'apiFail':
                errorParagraph.appendChild(document.createTextNode(ERROR_DESCRIPTIONS[message.name]));
                errorParagraph.appendChild(document.createElement('br'));

                let explaination;
                if (message.data.status === 0) {
                    explaination = 'Could not connect to the Last.fm API service.';
                }
                else {
                    explaination = `${message.data.status}: ${message.data.statusText}`;
                }
                errorParagraph.appendChild(document.createTextNode(explaination));
                break;
                
            default:
                errorParagraph.appendChild(document.createTextNode( 'Unhandled error. Whoops!'));
                break;
        }

        main.appendChild(errorParagraph);
    }
});

// TODO: Run constantly, not just on load.
browser.runtime.sendMessage('getRecentTracks');
