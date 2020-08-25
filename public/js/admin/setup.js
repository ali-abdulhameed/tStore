function setup() {

  var email = document.getElementById('email').value
  var password = document.getElementById('password').value
  var password2 = document.getElementById('password2').value

  var permittedEmails = new RegExp(/^[._A-Za-z0-9-\\+]+(\\.[_A-Za-z0-9-]+)*@gmail|hotmail|yahoo|outlook.com$/i)
  var permittedPasswords = new RegExp(/\s/g)

  if(password == password2) {



    if(permittedEmails.test(email)
    && !permittedPasswords.password
    && password.length > 0) {

      var params = new URLSearchParams();
      params.append('email', email)
      params.append('password', password)

      axios.post('/admin/setup', params).then(res => {

        if(res.data == 200) {
          window.location.href = '/admin/settings'
        } else {
          alert('Error: an account already exit')
        }

      }).catch(err => {
        alert('Unable to connect')
      })

    } else {

      alert('Didnt pass validation')

    }

  } else {

    alert('Non matching passwords')
  }
}
