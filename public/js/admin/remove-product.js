function removeProduct(id) {
  axios.post(`/admin/products/remove/${id}`).then(res => {

  document.querySelectorAll(`[product-id='${id}']`)[1].parentNode.parentNode.remove()
  alert('Product Was successfully deleted')

}).catch(err => {
  alert('Error')
})

}
