'use strict';

// Main container for output.
let main = document.querySelector('main');

const LASTFM_URL = 'https://www.last.fm';

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

    return document.createElement(type).appendChild(textNode).parentElement;
}

// Listen for messages from background Javascript.
browser.runtime.onMessage.addListener((message) => {
    main.textContent = '';

    if (message.status === 'success') {
        let data = message.data.recenttracks;

        let user = createElem('a', `${data['@attr'].user}::recent`);
        user.setAttribute('href', LASTFM_URL + '/user/' + data['@attr'].user);

        let header = createElem('header');
        header.appendChild(user);
        main.appendChild(header);

        let list = createElem('ul');
        data.track.forEach((track) => {
            let item = createElem('li');
            let nowPlaying = false;

            let date;
            if (track.hasOwnProperty('date')) {
                date = new Date(track.date.uts * 1000);
            }
            else {
                date = new Date();
                nowPlaying = true
            }

            let year = date.getFullYear();
            let month = (date.getMonth() + 1).toString().padStart(2, 0);
            let day = date.getDate().toString().padStart(2, 0);
            let hour = date.getHours().toString().padStart(2, 0);
            let minute = date.getMinutes().toString().padStart(2, 0);

            item.textContent = `[${year}-${month}-${day} ${hour}:${minute}] ${track.artist['#text']} - ${track.name}`;

            // Add a music note if the user is currently listening.
            if (nowPlaying) {
                item.textContent += ' \u266B';
            }

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

browser.runtime.sendMessage('getRecentTracks');
