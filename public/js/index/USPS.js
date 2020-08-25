


function trackOrder(orderID, status) {
  var trackingWindow = document.getElementById('tracking-window')
  if(status === 'Shipped') {
  trackingWindow.innerHTML = `<p style='font-size: 12px; text-align: left'>Order #${orderID}</p>`
  axios.post(`/account/orders/track-order/${orderID}`).then(res=> {

    if(res.data == 404) {
      trackingWindow.innerHTML +=
      '<pstyle="color: red; font-size: 16px">There was an error getting traking information</p>'
    } else {
      trackingWindow.innerHTML += `
      <p id="tracking-summary">${res.data.TrackResponse.TrackInfo.TrackSummary._text}</p>
      `
      var j = res.data.TrackResponse.TrackInfo.TrackDetail.length
      for(t of res.data.TrackResponse.TrackInfo.TrackDetail) {
        trackingWindow.innerHTML += `<p style="font-size: 12px; text-align: left">${j--}- ${t._text}</p>`
      }
    }

  }).catch(err=> {
    trackingWindow.innerHTML +=
    '<p style="color: red; font-size: 16px">There was an error getting traking information</p>'
  })
} else {
  trackingWindow.innerHTML = `<p style="color: red; font-size: 16px">Order hasn't been shipped yet</p>`

}
}
