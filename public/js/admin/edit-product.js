var productID
var pn, pd, pw, pp

function editProduct() {
var productName = document.getElementById('pn-edit').value
var productDesc = document.getElementById('pd-edit').value.replace(/"/g,"'")
var productWeight = document.getElementById('pw-edit').value
var productPrice = document.getElementById('pp-edit').value
var productImage = document.getElementById('pi-edit').files
var message = document.getElementById('product-edit-message')


var params = new FormData()
var contentType = {
  headers: {
    "content-type": "multipart/form-data"
  }
}
params.append('productID', productID)
params.append('productName', productName)
params.append('productDesc', productDesc)
params.append('productWeight', productWeight)
params.append('productPrice', productPrice)
if(productImage) params.append('productImage', productImage[0])

if(productID && (pn || pd || pw || pp || productImage)) {

    axios.post(`/admin/products/edit`, params, contentType).then(res => {

      message.innerHTML = 'Product was edited successfully'
      document.getElementById('product-edit-message').style.visibility = "visible"


      var tr = document.querySelectorAll(`[product-id='${productID}']`)[0].parentNode.parentNode
      var c = tr.children
      tr.style.background = 'rgba(33, 150, 243, 0.3)'

      if(pn) c[2].innerHTML = productName
      if(pd) c[3].innerHTML = productDesc
      if(pw) c[4].innerHTML = productWeight
      if(pp) c[5].innerHTML = productPrice
      if(res.data.productImage) c[9].innerHTML = `<img class="product-image" src="${res.data.productImage}" />`



  }).catch(err => {
    message.innerHTML = 'There was an error editing the product'
    document.getElementById('product-edit-message').style.visibility = "visible"

  })

}
}

function valueChange(el) {
  if(el === 'pn') pn = true
  if(el === 'pd') pd = true
  if(el === 'pw') pw = true
  if(el === 'pp') pp = true
}
