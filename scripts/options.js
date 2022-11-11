'use strict'

const alert = document.querySelector('#alert')

/**
 * Save extension settings.
 */
function saveSettings (e) {
  const settings = {}

  document.querySelectorAll('form .option input').forEach((element) => {
    const id = element.getAttribute('id')
    settings[id] = element.value
  })

  browser.storage.local.set(settings)
    .then(() => {
      return browser.runtime.sendMessage('reinitialize')
    }, reason => {
      console.error(reason)
    })
    .then(() => {
      // Computed style for transition duration is returned in seconds, convert to milliseconds for timeouts.
      const transitionDuration = parseFloat(getComputedStyle(alert).transitionDuration) * 1000

      alert.textContent = 'Settings saved, reinitializing'
      alert.classList.add('visible')
      setTimeout(() => {
        alert.classList.remove('visible')
        setTimeout(() => {
          alert.textContent = ''
        }, transitionDuration)
      }, transitionDuration + 1000)
    })

  e.preventDefault()
}

/**
 * Update form fields with extension settings.
 * @param settings
 */
function updateUI (settings) {
  for (const prop in settings) {
    if (Object.prototype.hasOwnProperty.call(settings, prop)) {
      const elem = document.getElementById(prop)
      if (elem) {
        elem.value = settings[prop]
      }
    }
  }
}

const settings = browser.storage.local.get()
settings.then(updateUI)

// HTML has all inputs as disabled and JS enables them. Prevents a JS error showing editable fields.
document.querySelectorAll('input')
  .forEach((input) => {
    input.disabled = false
  })

const saveButton = document.querySelector('input[type=submit]')
saveButton.addEventListener('click', saveSettings)
