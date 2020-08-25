function fetchProductInformation(id) {
  document.getElementById('product-edit-message').style.visibility = "hidden"
  productID = id
  var tr = document.querySelectorAll(`[product-id='${id}']`)[0].parentNode.parentNode.children
  document.getElementById('pn-edit').value = tr[2].innerHTML
  document.getElementById('pd-edit').value = tr[3].innerHTML
  document.getElementById('pw-edit').value = tr[4].innerHTML
  document.getElementById('pp-edit').value = tr[5].innerHTML

}
