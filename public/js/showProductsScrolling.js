(function(window, $){
  $(window).scroll(function() {
      if($(window).scrollTop() == $(document).height() - $(window).height()) {
             // ajax call get data from server and append to the div
             // Will be used to display more products with scroll down
      }
  });

})(window, jQuery)

<!--

<div class="product-image-wrapper">
  <div class="single-products">
    <a href="/product/{{this.productID}}">
      <div class="productinfo text-center">
        <img src="{{this.productImage}}" alt=""/>
        <h2>${{this.productPrice}}</h2>
        <p>{{this.productName}}</p>
        <a href="#" class="btn btn-default add-to-cart"><i class="fa fa-shopping-cart"></i>Add to cart</a>
      </div>
      </a>
  </div>
</div>
</div>



-->
