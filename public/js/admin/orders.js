

function getProduct(productID) {

  var productImage = document.getElementById('pi-view')
  var productName = document.getElementById('pn-view')
  var productDesc = document.getElementById('pd-view')
  var productWeight = document.getElementById('pw-view')
  var productPrice = document.getElementById('pp-view')
  var message = document.getElementById('product-view-message')
  message.style.visibility = 'hidden'
  axios.post(`/admin/orders/get-products/${productID}`).then(res=> {
    if(res.data == 404) {
      message.style.visibility = 'visible'
      message.innerHTML = "There was an error fetching the product"
    } else {
      document.getElementById('content-wrapper-product').scrollTop = 0
      productImage.src = res.data[0].productImage
      productName.value = res.data[0].productName
      productDesc.value = res.data[0].productDesc
      productWeight.value = 8
      productPrice.value = '$' + res.data[0].productPrice
    }
  }).catch(err=>{
    message.style.visibility = 'visible'
    message.innerHTML = "There was an error fetching the product"

  })
}



var shippingNumberChange = false;
var shippingNumbers = {}
var orderID

function getProducts(ordID, productIDs, amount, shippingCost, total, shippingNumber) {
  orderID = ordID
  shippingNumber = orderID in shippingNumbers ? shippingNumbers[orderID]: shippingNumber
  var ordersWin = document.getElementById('order-products')
  var message = document.getElementById('order-products-message')

  message.style.visibility = 'hidden'
  axios.post(`/admin/orders/get-products/${productIDs}`).then(res=> {
    if(res.data == 404) {
      message.style.visibility = 'visible'
      message.innerHTML = "There was an error fetching products"
    } else {
      document.getElementById('content-wrapper-orders').scrollTop = 0
      shippingNumberChange = false;
      ordersWin.innerHTML = ''
      for(p of res.data) {
        ordersWin.innerHTML += `
          <h2 id="order-products-message"></h2>
          <div style="text-align: center; margin-bottom: 4em">
            <img style="width: 10em" src="${p.productImage}" />
          </div>

          <div class="group">
            <input class="product-input" type="text" value="${p.productName}"/>
            <label class="product-name">Name</label>
            <div class="bar"></div>
          </div>
          <div class="group">
            <input class="product-input" type="text" value="${p.productWeight}lbs"/>
            <label class="product-name">Weight</label>
            <div class="bar"></div>
          </div>

          <div class="group">
            <input class="product-input" type="text" value="$${p.productPrice}"/>
            <label class="product-name">Price</label>
            <div class="bar"></div>
          </div>
          `
      }

      ordersWin.innerHTML += `
      <div style="font-size: 13px">
      <p>Amount: $${amount}</p>
      <p>Shipping: $${shippingCost}</p>
      <p>Total: $${total}</p>
      <div class="group">
        <input onclick="changeInTrackingNumber()" style="text-align: center" id="shipping-number-input" class="product-input" type="text" value="
        ${shippingNumber == '' ? 'Enter tracking number to process': shippingNumber}"/>

      </div>
      <div>
      <p style="text-align: center" id="process-order-message"></p>
      </div>
      </div>
      `

    }
  }).catch(err=>{

    message.style.visibility = 'visible'
    message.innerHTML = "There was an error fetching products"

  })

}

function changeInTrackingNumber() {

  shippingNumberChange = true;
  document.getElementById('shipping-number-input').value = ''

}

function updateShippingNumber() {

if(shippingNumberChange == true) {
  var params = new URLSearchParams()
  var shippingNumber = document.getElementById('shipping-number-input')
  var orderRow = document.querySelectorAll(`[order='${orderID}']`)[0]
  var productStatus = document.querySelectorAll(`[order-status='${orderID}']`)[0]
  var processOrderMessage = document.getElementById('process-order-message')
  params.append('shippingNumber', shippingNumber.value)

  axios.post(`/admin/orders/process-order/${orderID}`, params).then(res=> {

    if(res.data == 404) {
      processOrderMessage.style.color = 'red'
      processOrderMessage.innerHTML = 'There was an error processing the order'
    } else {
      productStatus.innerHTML = 'Shipped'
      orderRow.style.background = 'rgba(33, 150, 243, 0.3)'
      shippingNumbers[orderID] = shippingNumber.value
      processOrderMessage.style.color = 'green'
      processOrderMessage.innerHTML = "Order was processed successfully"
    }
  }).catch(err=> {
    processOrderMessage.style.color = 'red'
    processOrderMessage.innerHTML = 'There was an error processing the order'
  })

}



}
