function signup() {
  var firstName = document.getElementById('signup-first-name').value
  var lastName = document.getElementById('signup-last-name').value
  var email = document.getElementById('signup-email').value
  var password = document.getElementById('signup-password').value

  var permittedNames = new RegExp(/^[a-zA-Z]+$/)
  var permittedEmails = new RegExp(/^[._A-Za-z0-9-\\+]+(\\.[_A-Za-z0-9-]+)*@gmail|hotmail|yahoo|outlook.com$/i)
  var permittedPasswords = new RegExp(/\s/g)

  var errorMessage = document.getElementById('signup-error-message')

  if(permittedNames.test(firstName + lastName)
  && permittedEmails.test(email)
  && !permittedPasswords.test(password) && password.length > 0) {

    errorMessage.style.visibility = 'hidden'
    var params = new URLSearchParams();
    params.append('firstName', firstName)
    params.append('lastName', lastName)
    params.append('email', email)
    params.append('password', password)

    axios.post('/signup', params).then(res => {
      if(res.data == 200) {
        window.location.href = '/account/settings'

      } else {

        errorMessage.innerHTML = 'There was an error signing up. <br>'
        + 'Please refresh the page and try again.'
        errorMessage.style.visibility = 'visible'
      }

    }).catch(err => {

      errorMessage.innerHTML = 'There was an error signing up. <br>'
      + 'Please refresh the page and try again.'
      errorMessage.style.visibility = 'visible'

    })
  } else {

    errorMessage.innerHTML = "Error:<br>"
    + "- First and last names must be letters only<br>"
    + "- Email must be gmail, hotmail, yahoo, or outlook<br>"
    + "- Password must contain no spaces"
    errorMessage.style.visibility = 'visible'

  }
}
