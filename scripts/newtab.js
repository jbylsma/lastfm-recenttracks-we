'use strict';

// Main container for output.
let main = document.querySelector('main');

const LASTFM_URL = 'https://www.last.fm';

const PAGE_TITLE = 'Last.fm Recent Tracks';

// Plain-text descriptions for possible error messages.
const ERROR_DESCRIPTIONS = {
    settingsApiKey: 'The Last.fm API Key has not been set.',
    settingsUsers: 'No Last.fm users have been set.',
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

/**
 * Sanitize untrust text.
 *
 * @param text The text to sanitize
 */
function sanitize(text) {
    return createElem('text', text).textContent
}

// Listen for messages from background Javascript and display output.
browser.runtime.onMessage.addListener((message, sender) => {
    // Ignore messages from other tabs.
    if (sender.hasOwnProperty('tab')) {
       return;
    }

    // Clear out <main>.
    while (main.firstChild) {
        main.removeChild(main.firstChild);
    }

    if (message.status === 'success') {

        // Keep track of how many users are actively scrobbling
        let activeScrobblingCount = 0;

        message.responses.forEach(function(response) {
            let user = sanitize(response.user);

            let header = createElem('header');
            let userDiv = createElem('div');
            userDiv.className += 'user';
            let userHeader;
            userDiv.appendChild(header);

            if (response.status !== 200) {
                userDiv.className += ' error';
                userHeader = createElem('text', user);
                header.appendChild(userHeader);

                let errorText;
                if (response.status === 0) {
                    errorText = 'Could not connect to the Last.fm API service.';
                } else {
                    errorText = `${sanitize(response.status)}: ${sanitize(response.statusText)}`;
                }

                userDiv.appendChild(createElem('p', errorText));
                main.appendChild(userDiv);
                return;
            }

            let data = response.data.recenttracks;

            userHeader = createElem('a', `${sanitize(data['@attr'].user)}::recent`);
            userHeader.text = `${sanitize(data['@attr'].user)}::recent`;
            userHeader.setAttribute('href', LASTFM_URL + '/user/' + sanitize(data['@attr'].user));
            header.appendChild(userHeader);

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

                item.textContent = `[${year}-${month}-${day} ${hour}:${minute}] ${sanitize(track.artist['#text'])} - ${sanitize(track.name)}`;

                // Add a music note if the user is currently listening.
                if (nowPlaying) {
                    let active = createElem('span', '\u266B');
                    active.className = 'music-note';
                    item.appendChild(active);
                    activeScrobblingCount++;
                }

                list.appendChild(item);
            });

            userDiv.appendChild(list);
            main.appendChild(userDiv);
        });

        // If any users are actively scrobbling, add a note and count to the page title
        if (activeScrobblingCount > 0) {
            document.title = '\u266B (' + activeScrobblingCount + ') - ' + PAGE_TITLE;
        }
        else {
            // Otherwise, set it back to normal if all is quiet on the scrobbling front.
            document.title = PAGE_TITLE;
        }
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

            default:
                console.error('Bad message', message);
                errorParagraph.appendChild(createElem('text', 'Unhandled error. Whoops!'));
                break;
        }

        main.appendChild(errorParagraph);
    }
});

const refreshButton = document.querySelector('#refresh');
refreshButton.addEventListener('click', function() {
    browser.runtime.sendMessage('resetPolling');
});

browser.runtime.sendMessage('getRecentTracks');
