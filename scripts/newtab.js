'use strict'

// Main container for output.
const main = document.querySelector('main')

const LASTFM_URL = 'https://www.last.fm'

const PAGE_TITLE = 'Last.fm Recent Tracks'

const LIGHT_THEME_NAMES = ['Simply Red', 'Red, Red Wine', '99 Red Balloons', 'Little Red Corvette', '(The Angels Wanna Wear My) Red Shoes', 'My Little Red Book', 'Red Dragon Tattoo', 'Red River Rock']
const DARK_THEME_NAMES = ['Paint It, Black', 'Dark Star', 'Dancing in the Dark', 'The Dark End of the Street', 'Black Cow', 'Black Dog', 'Black Hole Sun', 'Black Magic Woman', 'Blackbird']

// Plain-text descriptions for possible error messages.
const ERROR_DESCRIPTIONS = {
  settingsApiKey: 'The Last.fm API Key has not been set.',
  settingsUsers: 'No Last.fm users have been set.'
}

const REFRESH_BUTTON = createElem('button', 'Refresh')
REFRESH_BUTTON.classList.add('button')
REFRESH_BUTTON.classList.add('refresh')
REFRESH_BUTTON.addEventListener('click', function (e) {
  e.preventDefault()
  browser.runtime.sendMessage('resetPolling')
})

const PAINT_BUTTON = createElem('button', getRandomThemeName(DARK_THEME_NAMES))
PAINT_BUTTON.classList.add('button')
PAINT_BUTTON.classList.add('paint')
PAINT_BUTTON.setAttribute('id', 'theme')
PAINT_BUTTON.addEventListener('click', function (e) {
  e.preventDefault()
  toggleTheme()
})

/**
 * Syntactic sugar for creating elements.
 *
 * @param type The type of Element to create. Use `text` for a textNode.
 * @param text The text for the Element.
 */
function createElem (type, text = null) {
  if (text === null) {
    return document.createElement(type)
  }

  const textNode = document.createTextNode(text)

  if (type === 'text') {
    return textNode
  }

  return document.createElement(type).appendChild(textNode).parentElement
}

/**
 * Sanitize untrusted text.
 *
 * @param text The text to sanitize
 */
function sanitize (text) {
  return createElem('text', text).textContent
}

/**
 * Fetches a random theme name for the button label, based on the provided theme type (light or dark)
 *
 * @param themeType either the light or dark theme type
 */
function getRandomThemeName (themeType) {
  const randomThemeIndex = getRandomInt(0, themeType.length)
  return themeType[randomThemeIndex]
}

/**
 * Gets a random integer, inclusive, between specified means
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
 *
 * @param min minimal integer that could be returned
 * @param max maximum integer that could be returned
 */
function getRandomInt (min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  // The maximum is exclusive and the minimum is inclusive.
  return Math.floor(Math.random() * (max - min) + min)
}

/**
 * Enable dark theme
 *
 * @param settings current local storage settings
 */
function enableDarkTheme (settings) {
  if (document.getElementById('theme') != null) {
    document.documentElement.setAttribute('data-theme', 'dark')
    document.getElementById('theme').textContent = getRandomThemeName(LIGHT_THEME_NAMES)
    settings.darkTheme = true
    browser.storage.local.set(settings)
  }
}

/**
 * Enable light theme
 *
 * @param settings current local storage settings
 */
function enableLightTheme (settings) {
  if (document.getElementById('theme') != null) {
    document.documentElement.setAttribute('data-theme', '')
    document.getElementById('theme').textContent = getRandomThemeName(DARK_THEME_NAMES)
    settings.darkTheme = false
    browser.storage.local.set(settings)
  }
}

/**
 * Loads the active theme from settings
 */
function loadTheme () {
  const storedSettings = browser.storage.local.get()
  return storedSettings.then(settings => {
    if (settings.darkTheme) {
      enableDarkTheme(settings)
    } else {
      enableLightTheme(settings)
    }

    return settings
  })
}

/**
 * Toggles the current them to the other one
 */
function toggleTheme () {
  const storedSettings = browser.storage.local.get()
  return storedSettings.then(settings => {
    if (settings.darkTheme) {
      enableLightTheme(settings)
    } else {
      enableDarkTheme(settings)
    }

    return settings
  })
}

// Listen for messages from background Javascript and display output.
browser.runtime.onMessage.addListener((message, sender) => {
  // Ignore messages from other tabs.
  if (Object.prototype.hasOwnProperty.call(sender, 'tab')) {
    return
  }

  // Clear out <main>.
  while (main.firstChild) {
    main.removeChild(main.firstChild)
  }

  // Load any stored theme
  loadTheme()

  if (message.status === 'success') {
    // Keep track of how many users are actively scrobbling
    let activeScrobblingCount = 0

    main.appendChild(REFRESH_BUTTON)
    main.appendChild(PAINT_BUTTON)

    message.responses.forEach(function (response) {
      const user = sanitize(response.user)

      const header = createElem('header')
      const userDiv = createElem('div')
      userDiv.className += 'user'
      let userHeader
      userDiv.appendChild(header)

      if (response.status !== 200) {
        userDiv.className += ' error'
        userHeader = createElem('text', user)
        header.appendChild(userHeader)

        let errorText
        if (response.status === 0) {
          errorText = 'Could not connect to the Last.fm API service.'
        } else {
          errorText = `${sanitize(response.status)}: ${sanitize(response.statusText)}`
        }

        userDiv.appendChild(createElem('p', errorText))
        main.appendChild(userDiv)
        return
      }

      const data = response.data.recenttracks

      userHeader = createElem('a', `${sanitize(data['@attr'].user)}::recent`)
      userHeader.text = `${sanitize(data['@attr'].user)}::recent`
      userHeader.setAttribute('href', LASTFM_URL + '/user/' + sanitize(data['@attr'].user))
      header.appendChild(userHeader)

      const list = createElem('ul')
      list.className = 'tracks'
      data.track.forEach((track) => {
        const item = createElem('li')
        let nowPlaying = false
        let loved = (track.loved > 0)

        let date
        if (Object.prototype.hasOwnProperty.call(track, 'date')) {
          date = new Date(track.date.uts * 1000)
        } else {
          date = new Date()
          nowPlaying = true
        }

        const year = date.getFullYear()
        const month = (date.getMonth() + 1).toString().padStart(2, 0)
        const day = date.getDate().toString().padStart(2, 0)
        const hour = date.getHours().toString().padStart(2, 0)
        const minute = date.getMinutes().toString().padStart(2, 0)
        item.appendChild(createElem('text', `[${year}-${month}-${day} ${hour}:${minute}]`))

        const artist = createElem('a', sanitize(track.artist.name))
        artist.setAttribute('href', track.artist.url)
        if (loved) { artist.className = 'loved' }
        item.appendChild(createElem('text', ' '))
        item.appendChild(artist)

        const trackName = createElem('a', sanitize(track.name))
        trackName.setAttribute('href', track.url)
        if (loved) { trackName.className = 'loved' }
        item.appendChild(createElem('text', ' - '))
        item.appendChild(trackName)

        // Add a music note if the user is currently listening.
        if (nowPlaying) {
          const active = createElem('span', '\u266B')
          active.className = 'music-note'
          item.appendChild(active)
          activeScrobblingCount++
        }

        list.appendChild(item)
      })

      userDiv.appendChild(list)
      main.appendChild(userDiv)
    })

    // If any users are actively scrobbling, add a note and count to the page title
    if (activeScrobblingCount > 0) {
      document.title = '\u266B (' + activeScrobblingCount + ') - ' + PAGE_TITLE
    } else {
      // Otherwise, set it back to normal if all is quiet on the scrobbling front.
      document.title = PAGE_TITLE
    }
  } else {
    const errorParagraph = createElem('p')

    if (Object.prototype.hasOwnProperty.call(ERROR_DESCRIPTIONS, message.name)) {
      const optionsLink = createElem('a', ERROR_DESCRIPTIONS[message.name])
      optionsLink.setAttribute('href', '')

      optionsLink.addEventListener('click', function () {
        browser.runtime.openOptionsPage()
        return false
      })
      errorParagraph.appendChild(optionsLink)
    } else {
      console.error('Bad message', message)
      errorParagraph.appendChild(createElem('text', 'Unhandled error. Whoops!'))
    }

    main.appendChild(errorParagraph)

    document.title = PAGE_TITLE
  }
})

browser.runtime.sendMessage('getRecentTracks')
