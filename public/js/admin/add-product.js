function addProduct() {

var productName = document.getElementById('pn').value
var productDesc = document.getElementById('pd').value.replace(/"/g,"'")
var productWeight = document.getElementById('pw').value
var productPrice = document.getElementById('pp').value
var productImage = document.getElementById('pi').files
var message = document.getElementById('product-add-message').firstElementChild
if(productName && productDesc
  && productWeight && productPrice && productImage) {

var params = new FormData()
var contentType = {
  headers: {
    "content-type": "multipart/form-data"
  }
}


params.append('productName', productName)
params.append('productDesc', productDesc)
params.append('productWeight', productWeight)
params.append('productPrice', productPrice)
params.append('productImage', productImage[0])

var tr = document.createElement('tr');

    axios.post(`/admin/products/add`, params, contentType).then(res => {
      message.innerHTML = 'Product was added successfully'
      message.parentNode.style.display = "unset"

      var productsTable = document.getElementsByClassName('fl-table')[0].getElementsByTagName('tbody')[0];

      tr.style.background = 'rgba(33, 150, 243, 0.3)'

      tr.innerHTML = `<td><input type="checkbox" /></td>`
      + `<td>${res.data.productID}</td>`
      + `<td>${productName}</td>`
      + `<td>${productDesc}</td>`
      + `<td>${productWeight}</td>`
      + `<td>${productPrice}</td>`
      + `<td>In stock</td>`
      + `<td>1</td>`
      + `<td>Now</td>`
      + `<td><img class="product-image" src="${res.data.productImage}" /></td>`
      + `<td><a href="#" class="trigger" data-modal-trigger="trigger-2" product-id="${res.data.productID}" onclick="fetchProductInformation(${res.data.productID})">Edit</a><br>
        <a href="#" product-id="${res.data.productID}" onclick="removeProduct(${res.data.productID})">Remove</a></td>`
      productsTable.insertBefore(tr,productsTable.firstChild);

      var tableWrapper = document.getElementsByClassName('table-wrapper')[0]
      tableWrapper.style.display = null
  }).catch(err => {
    tr.remove()
    message.innerHTML = 'There was an error adding the product'
    message.parentNode.style.display = "unset"

  })


} else {
  message.innerHTML = `Error: Some fields aren't set`
  message.parentNode.style.display = "unset"
}



}
