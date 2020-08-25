
function login() {
  var email = document.getElementById('login-email').value
  var password = document.getElementById('login-password').value

  var permittedEmails = new RegExp(/^[._A-Za-z0-9-\\+]+(\\.[_A-Za-z0-9-]+)*@gmail|hotmail|yahoo|outlook.com$/i)
  var permittedPasswords = new RegExp(/\s/g)

  var errorMessage = document.getElementById('login-error-message')

  if(permittedEmails.test(email)
  && !permittedPasswords.test(password) && password.length > 0) {

    errorMessage.style.visibility = 'hidden'
    var params = new URLSearchParams();
    params.append('email', email)
    params.append('password', password)

    axios.post('/login', params).then(res => {
      if(res.data == 200) {
        window.location.href = '/'

      } else {

        errorMessage.innerHTML = 'Invalid login information'
        errorMessage.style.visibility = 'visible'
      }

    }).catch(err => {

      errorMessage.innerHTML = 'There was an error logging in. <br>'
      + 'Please refresh the page and try again.'
      errorMessage.style.visibility = 'visible'
    })

  } else {
    errorMessage.innerHTML = "Error:<br>"
    + "- Email must be gmail, hotmail, yahoo, or outlook<br>"
    + "- Password must contain no spaces"
    errorMessage.style.visibility = 'visible'
  }

}
