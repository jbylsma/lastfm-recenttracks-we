'use strict';

// Main container for output.
let main = document.querySelector('main');

// Plain-text descriptions for possible error messages.
const ERROR_DESCRIPTIONS = {
    settingsApiKey: 'The Last.fm API Key has not been set.',
    settingsUsers: 'The Last.fm users have not been set.',
    apiFail: 'The Last.fm API request failed.',
};

/**
 * Syntactic sugar for creating elements.
 *
 * @param type The type of Element to create. Use `text` for a textNode.
 * @param text The text for the Element.
 */
function createElem(type, text = null) {
    if (text === null) {
        return document.createElement(type);
    }

    let textNode = document.createTextNode(text);

    if (type === 'text') {
        return textNode;
    }

    return document.createElement(type).appendChild(textNode);
}

// Listen for messages from background Javascript.
browser.runtime.onMessage.addListener((message) => {
    main.textContent = '';

    if (message.status === 'success') {
        let data = message.data.recenttracks;
        console.log(data);

        main.appendChild(createElem('header', `${data['@attr'].user}::recent`));

        let list = createElem('ul');
        data.track.forEach((track) => {
            let item = createElem('li');
            // TODO: Add dates.
            // TODO: Handle Now Playing.
            item.textContent = `${track.artist['#text']} - ${track.name}`;
            list.appendChild(item);
        });
        main.appendChild(list);
    }
    else {
        let errorParagraph = createElem('p');

        switch (message.name) {
            case 'settingsApiKey':
            case 'settingsUsers':
                let optionsLink = createElem('a', ERROR_DESCRIPTIONS[message.name]);
                optionsLink.setAttribute('href', '');

                optionsLink.addEventListener('click', function() {
                    browser.runtime.openOptionsPage();
                    return false;
                });
                errorParagraph.appendChild(optionsLink);
                break;

            case 'apiFail':
                errorParagraph.appendChild(createElem('text', ERROR_DESCRIPTIONS[message.name]));
                errorParagraph.appendChild(createElem('br'));

                let explaination;
                if (message.data.status === 0) {
                    explaination = 'Could not connect to the Last.fm API service.';
                }
                else {
                    explaination = `${message.data.status}: ${message.data.statusText}`;
                }
                errorParagraph.appendChild(createElem('text', explaination));
                break;
                
            default:
                errorParagraph.appendChild(createElem('text', 'Unhandled error. Whoops!'));
                break;
        }

        main.appendChild(errorParagraph);
    }
});

// TODO: Run constantly, not just on load.
browser.runtime.sendMessage('getRecentTracks');
