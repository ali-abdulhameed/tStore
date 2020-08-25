function updateSettings() {

  var street = document.getElementById('storeStreet').value
  street = street == 'Store Street' ? '': street
  var city = document.getElementById('storeCity').value
  city = city == 'Store City' ? '': city
  var state = document.getElementById('storeState').value
  state = state == 'Store State' ? '': state
  var zipcode = document.getElementById('storeZipcode').value
  var facebook = document.getElementById('storeFacebook').value
  facebook = facebook == 'Facebook' ? '': facebook
  var twitter = document.getElementById('storeTwitter').value
  twitter = twitter == 'Twitter' ? '': twitter
  var linkedin = document.getElementById('storeLinkedin').value
  linkedin = linkedin == 'Linkedin' ? '': linkedin

  var message = document.getElementById('errorMessage')

  var params = new URLSearchParams()

  params.append('storeStreet', street)
  params.append('storeCity', city)
  params.append('storeState', state)
  params.append('storeZipcode', zipcode)
  params.append('storeFacebook', facebook)
  params.append('storeTwitter', twitter)
  params.append('storeLinkedin', linkedin)

  if(!zipcode || zipcode === 'Store Zipcode *') {
    message.innerHTML = 'Zipcode must be entered'
    message.style.color = 'red'
    message.style.display = 'unset'
  } else {

    axios.post(`/admin/settings/update`, params).then(res=> {
      if(res.data == 200) {
        message.innerHTML = 'Settings were updated successfully'
        message.style.color = 'green'
        message.style.display = 'unset'
      } else {
        message.innerHTML = 'There was an error updating'
        message.style.color = 'red'
        message.style.display = 'unset'
      }
    }).catch(err=> {
      message.innerHTML = 'There was an error updating'
      message.style.color = 'red'
      message.style.display = 'unset'
    })
  }



}
