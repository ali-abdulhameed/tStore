function addToCart(productID) {
  var cart = document.getElementById('cart_number_of_items')
  var cartButton = document.querySelectorAll(`[cart-button='${productID}']`)
  axios.post(`/products/add-to-cart/${productID}`).then(res => {

    if(res.data == '200' ) {
      cart.innerHTML = parseInt(cart.innerHTML) + 1
      for(var i = 0; i < cartButton.length; i++) {
        cartButton[i].classList.remove('fa-shopping-cart')
        cartButton[i].classList.add('fa-check')
        cartButton[i].parentNode.children[1].innerHTML = 'Added'
      }
    } else if(res.data == '401') {
      window.location.href = '/entry'
    } else {
      alert('Product is already in cart')
      for(var i = 0; i < cartButton.length; i++) {
        cartButton[i].classList.remove('fa-shopping-cart')
        cartButton[i].classList.add('fa-check')
        cartButton[i].parentNode.children[1].innerHTML = 'Added'
      }
    }
  }).catch(err=> {
    alert('There was a problem adding product to cart.Refresh the page then try again.')
  })
}

function deleteProductFromCart(productID) {
  var cart = document.getElementById('cart_number_of_items')
  var product = document.querySelectorAll(`[product-id='${productID}']`)[0]
  axios.post(`/products/delete-from-cart/${productID}`).then(res => {

      if(res.data == '200') {
        cart.innerHTML = parseInt(cart.innerHTML) - 1
        product.remove()
        alert('Product has been deleted')
      } else if(res.data == '401') {
        window.location.href = '/entry'
      } else {
        alert('There was an error deleting the product from cart. Please refresh the page')
      }

  }).catch(err=> {
    alert('There was a problem deleting product from cart. Refresh the page then try again.')
  })
}

function updateCart() {

  var cartInfo = document.getElementById('cart-info')
  var cartAmount = document.getElementById('cart-amount')
  var cartShippingCost = document.getElementById('cart-shipping-cost')
  var cartTotal = document.getElementById('cart-total')
  var paypalButton = document.getElementById('paypal-button')
  var checkoutLoading = document.getElementById('checkout-loading')

  cartInfo.style.display = 'none'
  checkoutLoading.style.display = ''

  axios.post('/cart/create-payment').then(res=> {
    if(res.data != 404) {
      cartAmount.innerHTML = '$' + res.data.amount
      cartShippingCost.innerHTML = '$' + res.data.shippingCost
      cartTotal.innerHTML = '$' + res.data.total
      paypalButton.href = res.data.url
      checkoutLoading.style.display = 'none'
      cartInfo.style.removeProperty('display')
    } else {
      alert('Error: please make sure your settings information are correct')
    }
  }).catch(err=> {
    alert('err, no con')
  })

}
