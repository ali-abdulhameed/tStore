
// var fn, ln,pn, st, cy, se, zc
function update() {
var firstName = document.getElementById('firstName').value
var lastName = document.getElementById('lastName').value
var phoneNumber = document.getElementById('phoneNumber').value
phoneNumber = phoneNumber.length === 0 ? 6666: phoneNumber
var street = document.getElementById('street').value
var city = document.getElementById('city').value
var state = document.getElementById('state').value
var zipCode = document.getElementById('zipCode').value

var errorMessage = document.getElementById('errorMessage')


var params = new URLSearchParams();

params.append('firstName', firstName)
params.append('lastName', lastName)
params.append('phoneNumber', phoneNumber)
params.append('street', street)
params.append('city', city)
params.append('state', state)
params.append('zipCode', zipCode)




  axios.post('/account/update-settings', params).then(res => {

    if(res.data == 200) {
      alert('Form have been updated successfully')
    } else {

      errorMessage.innerHTML = "Error updating.<br>"
      + "Please make sure to enter the appropriate values"
      errorMessage.style.visibility = 'visible'
    }

  }).catch(err => {
    errorMessage.innerHTML = "Error updating.<br>"
    + "Please refresh the page."
    errorMessage.style.visibility = 'visible'
  })



}
