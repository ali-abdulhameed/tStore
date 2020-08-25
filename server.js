const express = require('express')
const path = require('path')
const app = express()
const database = require("./models/db_connect") // Connects to database and returns a pool of connections
const handlebars = require('express-handlebars') // Handlebars templating engine
const crypto = require('crypto') // Used for the login system cookies
const bcrypt = require('bcrypt') // Used for hashing passwords
const axios = require('axios') // Used for making post request
const xml = require('xml-js') // Used to parse USPS api post data to json and js objects
const multer = require('multer') // Used for processing multipart/form-data data
const paypal = require('paypal-rest-sdk') // Paypal apis sdk
/*
The site uses paypal as a payment method. It requires you
to create a paypal app using your acccount which will
give you a client_id and client_secret.
In deployment the mode must be set to Production.
*/
paypal.configure({
  mode: 'sandbox',
  client_id: 'Your Paypal client ID',
  client_secret: 'Your Paypal Client Secret'
})
/*
USPS is the default carrier. The site uses it
to get tracking information and shipping cost estimation.
You will have to create an account with USPS Web Tools
API Portal which will give you an access token that allows
you to utilize its apis.
*/
const USPS = {
  accessToken: 'Your USPS access token',
  api: 'https://secure.shippingapis.com/ShippingAPI.dll?API='
}
// Used for uploading product images
const uploadProductImage = multer({
  storage: multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, 'public/productsImages')
    },
    filename: function(req, file, cb) {

      crypto.randomBytes(8, (err, buf) => {

        if (err) {
          console.log('Error generating random characters for image upload url')
        } else {
          cb(null, buf.toString('base64').replace(/=/g, '') + '-' + encodeURIComponent(file.originalname))
        }
      })
    }
  }),
  limits: {
    fileSize: 1000000 * 5
  },
  fileFilter: function(req, file, cb) {
    let i = 'image/'
    let permittedFileExts = [i + 'jpeg', i + 'jpg', i + 'png', i + 'svg']
    for (ext of permittedFileExts) {
      if (file.mimetype === ext) {
        cb(null, true)
        return
      }
    }
    cb(null, false)
  }
})

app.engine('hbs', handlebars({
  extname: 'hbs',
  defaultLayout: '',
  layoutsDir: ''
}))

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'hbs')
app.use(require("cookie-parser")())
app.use(express.static('public'))
app.use(express.urlencoded({
  extended: true
}))
// Retrieve db connection from pool
app.use(function(req, res, next) {
  database.getConnection(function(err, connection) {
    if (err) {
      res.render('index/404')
    } else {
      req.db = connection
      next()
    }
  })
})
/*
USPS shipping cost estimation uses the sender's
and receiver's zipcodes.
*/
app.use(function(req, res, next) {
  if (USPS.ZipOrigination === undefined) {
    req.db.query(`SELECT storeZipcode FROM Settings`, function(err, result, fields) {
      if (err) {
        console.log('error getting store zipcode which is used for shipping cost estimation')
        /* This site is intended for a client and this is its
        warehouse zipcode. **should be changed**
        */
        USPS.ZipOrigination = 55401
      } else {
        USPS.ZipOrigination = result[0].storeZipcode
      }
      next()
    })
  } else {
    next()
  }
})
/*
Checked if the admin login session cookie exits.
It it does, it verifies it and parses its contents.
*/
app.use('/admin*', function(req, res, next) {

  var adminCookie = req.cookies.Admin

  if (adminCookie === undefined) {
    next()
  } else {
    req.db.query(`SELECT * FROM Admins WHERE adminID = ${adminCookie.adminID}`, function(err, result, fields) {
      if (err) {
        console.log('Error at admin cookie handler')
        console.log(err)
        res.clearCookie('Admin')
        next()
      } else {

        try {
          const algorithm = 'aes-192-cbc';
          const key = Buffer.from(result[0].loginSessionKey, 'hex')
          const iv = key.slice(0, 16)

          const decipher = crypto.createDecipheriv(algorithm, key, iv);
          var decrypted = '';

          decipher.on('readable', () => {
            while (null !== (chunk = decipher.read())) {
              decrypted += chunk.toString('utf8');
            }

            decipher.on('end', () => {

              if (result[0].adminID == decrypted) {
                req['Admin'] = {
                  adminID: decrypted,
                  adminEmail: result[0].email
                }
                next()
              } else {
                throw 'Invalid Cookie'
              }
            })
          })

          var encrypted = adminCookie.sessionToken
          decipher.write(encrypted, 'hex');
          decipher.end();
        } catch (err) {
          res.clearCookie('Admin')
          next()
        }
      }
    })
  }
})
/*
Checks if the post request on the admin side
is authenticated.
*/
app.post('/admin*', function(req, res, next) {
  if (req.Admin === undefined &&
    req.originalUrl !== '/admin/setup' &&
    req.originalUrl !== '/admin/login') {
    res.send('404')
  } else {
    next()
  }
})
/*
Checked if the user login session cookie exits.
It it does, it verifies it and parses its contents.
*/
app.use(function(req, res, next) {

  var userCookie = req.cookies.User

  if (userCookie === undefined) {

    next()

  } else {
    req.db.query(`SELECT * FROM Users WHERE userID = ${userCookie.userID}`, function(err, result, fields) {
      if (err) {
        console.log('Error at user cookie handler')
        console.log(err)
        res.clearCookie('User')
        next()
      } else {

        try {
          const algorithm = 'aes-192-cbc';
          const key = Buffer.from(result[0].loginSessionKey, 'hex')
          const iv = key.slice(0, 16)

          const decipher = crypto.createDecipheriv(algorithm, key, iv);
          var decrypted = '';

          decipher.on('readable', () => {
            while (null !== (chunk = decipher.read())) {
              decrypted += chunk.toString('utf8');
            }

            decipher.on('end', () => {

              if (result[0].userID == decrypted) {
                req['User'] = {
                  userID: decrypted
                }
                next()
              } else {
                throw 'Invalid Cookie'
              }
            })
          })

          var encrypted = userCookie.sessionToken
          decipher.write(encrypted, 'hex');
          decipher.end();
        } catch (err) {
          res.clearCookie('User')
          next()
        }
      }
    })
  }
})
/*
Checked if the checkout cookie exits.
It it does, it verifies it and parses its contents.

The checkout cookie is used to finish off the Paypal
payment placement process.
*/
app.use(function(req, res, next) {

  var checkoutCookie = req.cookies.Checkout

  if (checkoutCookie === undefined) {
    next()
  } else {
    req.db.query(`SELECT * FROM Users WHERE userID = ${checkoutCookie.userID}`, function(err, result, fields) {
      if (err) {
        console.log('Error at checkout cookie handler')
        console.log(err)
        res.clearCookie('Checkout')
        next()
      } else {

        try {
          const algorithm = 'aes-192-cbc';
          const key = Buffer.from(result[0].loginSessionKey, 'hex')
          const iv = key.slice(0, 16)

          const decipher = crypto.createDecipheriv(algorithm, key, iv);
          var decrypted = '';

          decipher.on('readable', () => {
            while (null !== (chunk = decipher.read())) {
              decrypted += chunk.toString('utf8');
            }

            decipher.on('end', () => {

              var checkoutParams = JSON.parse(decrypted)
              checkoutParams.productIDs = checkoutParams.productIDs.split(',').map(Number)
              checkoutParams.userID = result[0].userID
              req['Checkout'] = checkoutParams
              next()
            })
          })

          var encrypted = checkoutCookie.data
          decipher.write(encrypted, 'hex');
          decipher.end();
        } catch (err) {
          res.clearCookie('Checkout')
          next()
        }
      }
    })
  }
})
/*
Retrieves all products for a specific user.
*/
app.get('/cart', function(req, res) {

  if (req.User === undefined) {
    res.redirect('/entry')
  } else {

    req.db.query(`SELECT * FROM Products p RIGHT JOIN Carts c ON p.productID = c.productID WHERE c.userID = ${req.User.userID}`, function(err, result, fields) {
      if (err) {
        console.log('error getting cart producsts in /cart')
        res.redirect('/404')
      } else {
        res.render('index/cart', {
          userID: req.User.userID,
          cart: {
            size: result.length,
            products: result
          }
        })
      }
    })
  }
})
/*
Created the Paypal payment url in which the user will
click on and gets taken to the paypal site to pay the
due amount.

Replace the "loaclhost:3000" with your site url.
*/
app.post('/cart/create-payment', function(req, res) {

  if (req.User === undefined) {
    res.send('404')
  } else {
    res.clearCookie('Checkout')
    req.db.query(`SELECT * FROM Users WHERE userID = ${req.User.userID}`, function(err, result, fields) {
      if (err) {
        console.log('error at getting user at checkout')
        res.send('404')
      } else {
        req.db.query(`UPDATE Products p LEFT JOIN Carts c ON p.productID = c.productID SET soldUserID = ${req.User.userID}, ` +
          `soldUserTimestamp = CURRENT_TIMESTAMP() WHERE c.userID = ${req.User.userID} ` +
          `AND (SELECT COUNT(c2.soldUserID) FROM (SELECT * FROM Carts) c2 WHERE c2.productID = p.productID AND c2.soldUserID IS NOT NULL` +
          ` AND TIMESTAMPDIFF(MINUTE,c2.soldUserTimestamp, CURRENT_TIMESTAMP()) < 5) = 0 ` +
          `AND productStatus = 'In Stock'`,
          function(err2, result2, fields2) {

            if (err2) {
              console.log('error at updating product status in checkout')
              console.log(err2)
              res.send('404')
            } else {

              req.db.query(`SELECT p.productID, p.productPrice, p.productWeight FROM Products p LEFT JOIN Carts c ON p.productID = c.productID WHERE soldUserID = ${req.User.userID}`, function(err3, result3, fields3) {

                if (err3) {
                  console.log('error at getting user sold products in checkout')
                  console.log(err3)
                  res.send('404')
                } else if (result3.length > 0) {

                  var productIDs = []
                  var amount = 0
                  var weight = 0

                  Object.keys(result3).map(key => {
                    productIDs.push(result3[key].productID)
                    amount += result3[key].productPrice
                    weight += result3[key].productWeight
                  })

                  var shippingCostApi = USPS.api + `RateV4&XML=` +
                    `<RateV4Request USERID="${USPS.accessToken}">` +
                    `<Package ID="0">` +
                    `<Service>PRIORITY</Service>` +
                    `<ZipOrigination>${USPS.ZipOrigination}</ZipOrigination>` +
                    `<ZipDestination>${result[0].userZipcode}</ZipDestination>` +
                    `<Pounds>${weight}</Pounds>` +
                    `<Ounces>0</Ounces>` +
                    `<Container></Container>` +
                    `<Machinable>TRUE</Machinable>` +
                    `</Package>` +
                    `</RateV4Request>`

                  axios.get(shippingCostApi).then(rate => {

                    var shippingCost = parseInt(xml.xml2js(rate.data, {
                      compact: true,
                      spaces: 4
                    }).RateV4Response.Package.Postage.Rate._text)
                    var total = amount + shippingCost

                    const algorithm = 'aes-192-cbc';
                    const key = Buffer.from(result[0].loginSessionKey, 'hex')
                    const iv = key.slice(0, 16)
                    const cipher = crypto.createCipheriv(algorithm, key, iv);

                    let encrypted = '';
                    cipher.on('readable', () => {
                      let chunk;
                      while (null !== (chunk = cipher.read())) {
                        encrypted += chunk.toString('hex');
                      }
                    })

                    cipher.on('end', () => {

                      var paymentParams = {
                        intent: 'sale',
                        payer: {
                          payment_method: 'paypal'
                        },
                        transactions: [{
                          amount: {
                            total: total.toFixed(2),
                            currency: 'USD'
                          }
                        }],
                        redirect_urls: {
                          return_url: 'http://localhost:3000/cart/checkout',
                          cancel_url: 'http://localhost:3000/cart/checkout-canclled'
                        }
                      }

                      paypal.payment.create(paymentParams, function(error, payment) {
                        if (error) {
                          console.log('error at creating payment')
                          console.log(error)
                          res.send('404')
                        } else {
                          var url = ''
                          payment.links.forEach(link => {
                            if (link.rel === 'approval_url') {
                              url = link.href;
                            }
                          })

                          res.cookie('Checkout', {
                            "userID": req.User.userID,
                            "data": encrypted
                          }, {
                            expires: new Date(Date.now() + 7 * 24 * 3600000),
                            httpOnly: true
                          })

                          res.json({
                            url: url,
                            shippingCost: shippingCost.toFixed(2),
                            amount: amount.toFixed(2),
                            total: total.toFixed(2)
                          })

                        }
                      })
                    })

                    cipher.write(`{
                                "productIDs": "${productIDs.join(',')}",
                                "amount": ${amount},
                                "shippingCost": ${shippingCost},
                                "total": ${total}
                              }`)

                    cipher.end()

                  }).catch(shErr => {
                    console.log('error at getting shipping cost')
                    console.log(shErr)
                    res.send('404')
                  })

                } else {
                  res.json({
                    url: 'javascript:;',
                    shippingCost: 0,
                    amount: 0,
                    total: 0
                  })
                }

              })
            }
          })
      }
    })
  }
})
/*
Once the user pays the due amount on the Paypal site,
it will be redirected to the following path. Here the
payment will be executed and its information will be
saved in the database.
*/
app.get('/cart/checkout', function(req, res) {
  var {
    paymentId,
    PayerID
  } = req.query
  if (req.User === undefined ||
    req.Checkout === undefined ||
    paymentId === undefined ||
    PayerID === undefined) {
    res.redirect('/404')
  } else {

    var {
      productIDs,
      amount,
      shippingCost,
      total
    } = req.Checkout
    var paymentParams = {
      payer_id: PayerID,
      transactions: [{
        amount: {
          currency: 'USD',
          total
        }
      }]
    }

    paypal.payment.execute(paymentId, paymentParams, (error, payment) => {

      if (error) {
        res.redirect('/404')
      } else {

        req.db.query(`SELECT * FROM Users WHERE userID = ${req.Checkout.userID}`, function(err, result, fields) {

          if (err) {
            console.log('error getting user info at processing checkout')
            res.redirect('/404')
          } else {
            req.db.query(`INSERT INTO Orders(userID, productIDs, orderStatus, userStreet, userCity, userState, userZipcode, cartAmount, cartShippingCost, cartTotal, paypalPaymentId)` +
              ` VALUES(${result[0].userID}, "${productIDs.join(',')}", 'Pending', '${result[0].userStreet}',` +
              ` '${result[0].userCity}', '${result[0].userState}', '${result[0].userZipcode}', ${amount}, ${shippingCost}, ${total}, '${paymentId}')`,
              function(err1, result1, fields1) {

                if (err1) {
                  console.log('error inserting user fields to orders')
                  console.log(err1)
                  res.redirect('/404')
                } else {
                  req.db.query(`DELETE FROM Carts WHERE productID IN (${productIDs.join(',')})`, function(err2, result2, fields2) {
                    if (err2) {
                      console.log('err getting rid of products in cart')
                    }
                    req.db.query(`UPDATE Products SET productStatus = 'Sold' WHERE productID IN (${productIDs.join(',')})`, function(err3, result3, fields3) {

                      if (err3) {
                        console.log('error updating products status in checkout')
                        console.log(err3)
                        res.redirect('/404')
                      } else {
                        res.clearCookie('Checkout')
                        req.db.query(`SELECT COUNT(*) AS cartSize FROM Carts WHERE userID = ${req.Checkout.userID}`, function(err4, result4, fields4) {
                          if (err4) {
                            console.log('error at getting cart products in checkout')
                            res.redirect('/404')
                          } else {
                            res.render('index/invoice', {
                              userID: req.Checkout.userID,
                              cart: {
                                size: result4[0].cartSize
                              },
                              order: {
                                orderID: result1.insertId,
                                productIDs,
                                amount,
                                shippingCost,
                                total
                              }
                            })
                          }
                        })
                      }
                    })
                  })
                }
              })
          }
        })
      }
    })
  }
})
/*
Checks of the admin login session cookie exists.
If it doesn't, it gets shown the login page.
*/
app.get(['/admin', '/admin/login'], function(req, res) {
  if (req.Admin === undefined) {
    res.render('admin/login')
  } else {
    res.redirect('/admin/dashboard')
  }
})
/*
This site is for a single store (client request) so
when the site is first deployed, you will be able to
create admin login info only once.

If the admin login info was lost or forgotten,
you will have to go to the Admins table and delete
the 1 row there. Once you do that you will be able
to go to the setup page and create new login info.
*/
app.get('/admin/setup', function(req, res) {
  if (req.Admin !== undefined) {
    res.redirect('/admin')
  } else {
    res.render('admin/setup')
  }
})
/*
Path to process admin setup post request.
*/
app.post('/admin/setup', function(req, res) {

  req.db.query(`SELECT * FROM Admins`, function(err0, result0, fields0) {
    if (err0 || result0.length > 0) {
      res.send('404')
    } else {
      var email = req.body.email
      var password = req.body.password

      var permittedEmails = new RegExp(/^[._A-Za-z0-9-\\+]+(\\.[_A-Za-z0-9-]+)*@gmail|hotmail|yahoo|outlook.com$/i)
      var permittedPasswords = new RegExp(/\s/g)

      if (permittedEmails.test(email) &&
        !permittedPasswords.password &&
        password.length > 0) {
        var saltRounds = 8 // admin user
        bcrypt.genSalt(saltRounds, function(err, salt) {
          bcrypt.hash(password, salt, function(err, hash) {

            req.db.query(`INSERT INTO Admins(email, password) VALUES('${email}', '${hash}')`, function(err, result, fields) {
              if (err) {
                console.log(err)
                res.send('400')
              } else {

                crypto.randomBytes(24, (err, buf) => {

                  if (err) {
                    console.log(err)
                    res.send('404')

                  } else {

                    const algorithm = 'aes-192-cbc';
                    const key = buf
                    const iv = buf.slice(0, 16)
                    const cipher = crypto.createCipheriv(algorithm, key, iv);

                    let encrypted = '';
                    cipher.on('readable', () => {
                      let chunk;
                      while (null !== (chunk = cipher.read())) {
                        encrypted += chunk.toString('hex');
                      }
                    })

                    cipher.on('end', () => {

                      req.db.query(`UPDATE Admins SET loginSessionKey = "${buf.toString('hex')}" WHERE adminID = ${result.insertId}`, function(err, result2, fields) {
                        if (err) {
                          console.log(err)
                          res.send('404')
                        } else {
                          res.cookie('Admin', {
                            "adminID": result.insertId,
                            "sessionToken": encrypted
                          }, {
                            expires: new Date(Date.now() + 7 * 24 * 3600000),
                            httpOnly: true,
                            sameSite: 'strict'
                          })
                          res.send('200')
                        }
                      })
                    })

                    cipher.write(result.insertId.toString());
                    cipher.end();
                  }
                })
              }
            })
          })
        })

      } else {
        console.log('didnt pass validation')
        res.send('404')
      }
    }
  })
})
/*
Path to process admin login post request.
*/
app.post('/admin/login', function(req, res) {


  var email = req.body.email
  var password = req.body.password

  var permittedEmails = new RegExp(/^[._A-Za-z0-9-\\+]+(\\.[_A-Za-z0-9-]+)*@gmail|hotmail|yahoo|outlook.com$/i)
  var permittedPasswords = new RegExp(/\s/g)

  if (permittedEmails.test(email) &&
    !permittedPasswords.test(password) && password.length > 0) {

    req.db.query(`SELECT * FROM Admins WHERE email = '${email}'`, function(err, result, fields) {
      if (err) {
        console.log('req.db error at admin login')
        res.send('404')
      } else if (result.length == 0) {
        console.log('Admin not found')
        res.send('404')
      } else {

        bcrypt.compare(password, result[0].password, function(err, status) {

          if (status === true) {

            crypto.randomBytes(24, (err, buf) => {

              if (err) {
                console.log('Random bytes error in admin login')
                res.send('404')

              } else {

                const algorithm = 'aes-192-cbc';
                const key = buf
                const iv = buf.slice(0, 16)
                const cipher = crypto.createCipheriv(algorithm, key, iv);

                let encrypted = '';
                cipher.on('readable', () => {
                  let chunk;
                  while (null !== (chunk = cipher.read())) {
                    encrypted += chunk.toString('hex');
                  }
                })

                cipher.on('end', () => {

                  req.db.query(`UPDATE Admins SET loginSessionKey = "${buf.toString('hex')}" WHERE adminID = ${result[0].adminID}`, function(err, result2, fields) {
                    if (err) {
                      console.log(err)
                      res.send('404')
                    } else {
                      res.clearCookie('Admin')
                      res.cookie('Admin', {
                        "adminID": result[0].adminID,
                        "sessionToken": encrypted
                      }, {
                        expires: new Date(Date.now() + 7 * 24 * 3600000),
                        httpOnly: true,
                        sameSite: 'strict'
                      })
                      res.send('200')
                    }
                  })
                })
                cipher.write('' + result[0].adminID);
                cipher.end();
              }
            })
          } else {
            console.log('invalid admin login password')
            res.send('401')
          }
        })
      }
    })
  } else {
    console.log('didnt pass validation')
    res.send('404')
  }

})

app.get('/admin/dashboard', function(req, res) {

  if (req.Admin === undefined) {
    res.redirect('/admin')
  } else {

    req.db.query(`SELECT COUNT(*) AS p FROM Products WHERE DATE(insertionDate) = DATE(NOW())`, function(err, result, fileds) {
      if (err) {
        console.log('error getting products in admin dashboard')
        res.redirect('/404')
      } else {
        req.db.query(`SELECT COUNT(*) AS v FROM Orders WHERE orderStatus = 'Pending'` +
          ` UNION ALL SELECT SUM(cartTotal) FROM Orders WHERE DATE(date) = DATE(NOW())` +
          ` UNION ALL SELECT SUM(cartTotal) FROM Orders WHERE DATE(date) = DATE(NOW() - INTERVAL 1 DAY)`,
          function(err1, result1, fileds1) {
            if (err1) {
              console.log('error getting orders in admin dashboard')
              res.redirect('/404')
            } else {
              req.db.query(`SELECT COUNT(*) AS u FROM Users WHERE signupDate >= NOW() - INTERVAL 1 DAY`, function(err2, result2, fileds2) {
                if (err2) {
                  console.log('error getting users in admin dashboard')
                  res.redirect('/404')
                } else {
                  res.render('admin/dashboard', {
                    admin: {
                      email: req.Admin.adminEmail
                    },
                    stats: {
                      products: result[0].p,
                      orders: {
                        number: result1[0].v,
                        todaysRev: result1[1].v || 0,
                        yesterdaysRev: result1[2].v || 0
                      },
                      users: result2[0].u
                    }
                  })
                }
              })
            }
          })
      }
    })
  }
})

app.get('/admin/products', function(req, res) {

  if (req.Admin === undefined) {
    res.redirect('/admin')
  } else {
    req.db.query(`SELECT * FROM Products ORDER BY productID DESC`, function(err, result, fields) {
      if (err) throw err;
      res.render('admin/products', {
        admin: {
          email: req.Admin.adminEmail
        },
        products: result
      })
    })
  }
})


app.get('/admin/orders', function(req, res) {

  if (req.Admin === undefined) {
    res.redirect('/admin')
  } else {

    req.db.query(`SELECT * FROM Orders`, function(err, result, fields) {
      if (err) {
        console.log('error getting orders')
        res.redirect('/404')
      } else {

        result.forEach(p => {
          p.productIDs = p.productIDs.split(',')
          p.date = p.date.toString().split(' ').slice(0, 4).join(' ')
        })

        res.render('admin/orders', {
          admin: {
            email: req.Admin.adminEmail
          },
          orders: result
        })
      }
    })
  }
})
/*
Used to get all products purchased within a specific order.
*/
app.post('/admin/orders/get-products/:ids', function(req, res) {
  if (req.Admin === undefined) {
    res.send('404')
  } else {
    req.db.query(`SELECT * FROM Products WHERE productID IN (${req.params.ids})`, function(err, result, fields) {
      if (err) {
        console.log('error at getting order products via post')
        res.send('404')
      } else {
        res.json(result)
      }
    })
  }
})
/*
Used to process an order. An order is processed by entering
the tracking number of the products that were shipped to the user.
*/
app.post('/admin/orders/process-order/:orderID', function(req, res) {
  if (req.Admin === undefined) {
    res.send('404')
  } else {
    req.db.query(`UPDATE Orders SET orderStatus = 'Shipped', shippingNumber = ' ${req.body.shippingNumber}' WHERE orderID = ${req.params.orderID}`, function(err, result, fields) {
      if (err) {
        console.log('error at updating shipping number')
        console.log(err)
        res.send('404')
      } else {
        res.send('200')
      }
    })
  }
})

app.get('/admin/analytics', function(req, res) {

  if (req.Admin === undefined) {
    res.redirect('/admin')
  } else {

    req.db.query(`SELECT MONTH(date) AS ordersMonth, COUNT(*) AS ordersCount FROM Orders WHERE date >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY MONTH(date)`, function(err, result, fields) {
      if (err) {
        console.log('error at getting orders')
        res.redirect('/404')
      } else {

        req.db.query(`SELECT MONTH(insertionDate) AS productsMonth, COUNT(*) AS productsCount FROM Products WHERE insertionDate >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY MONTH(insertionDate)`, function(err1, result1, fields1) {
          if (err1) {
            console.log('error at getting products')
            res.redirect('/404')
          } else {
            req.db.query(`SELECT MONTH(signupDate) AS usersMonth, COUNT(*) AS usersCount FROM Users WHERE signupDate >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY MONTH(signupDate)`, function(err2, result2, fields2) {
              if (err2) {
                console.log('error at getting users')
                res.redirect('/404')
              } else {

                req.db.query(`SELECT (SELECT COUNT(*) FROM Orders) AS numberOfOrders,` +
                  ` (SELECT COUNT(*) FROM Products) AS numberOfProducts,` +
                  ` (SELECT COUNT(*) FROM Users) AS numberOfUsers,` +
                  ` (SELECT SUM(cartTotal) FROM Orders) AS totalRevenue FROM dual`,
                  function(err3, result3, fields3) {
                    if (err3) {
                      console.log('error getting numbers of orders, products, and users')
                      res.redirect('/404')
                    } else {

                      req.db.query(`SELECT userState, COUNT(*) AS stateOrders FROM Orders GROUP BY userState`, function(err4, result4, fields4) {
                        if (err4) {

                          console.log('error getting orders per state')
                          res.redirect('/404')
                        } else {

                          var stats = {}
                          result.forEach(o => {
                            stats[o.ordersMonth] = [o.ordersCount, 0, 0]
                          })

                          result1.forEach(p => {

                            if (stats[p.productsMonth] === undefined) {
                              stats[p.productsMonth] = [0, p.productsCount, 0]
                            } else {
                              stats[p.productsMonth][1] = p.productsCount
                            }
                          })

                          result2.forEach(u => {

                            if (stats[u.usersMonth] === undefined) {
                              stats[u.usersMonth] = [0, 0, u.usersCount]
                            } else {
                              stats[u.usersMonth][2] = u.usersCount
                            }
                          })

                          var columnChart = [
                            ['Months', 'Orders', 'Products', 'Users']
                          ]
                          Object.keys(stats).forEach(key => {

                            stats[key].unshift(key)
                            columnChart.push(stats[key])
                          })

                          var geoChart = ''

                          result4.forEach(s => geoChart += '/' + s.userState + ',' + s.stateOrders)
                          geoChart = geoChart.substr(1)
                          res.render('admin/analytics', {
                            admin: {
                              email: req.Admin.adminEmail
                            },
                            stats: {
                              columnChart,
                              geoChart,
                              totalRevenue: result3[0].totalRevenue,
                              numberOfOrders: result3[0].numberOfOrders,
                              numberOfProducts: result3[0].numberOfProducts,
                              numberOfUsers: result3[0].numberOfUsers
                            }
                          })
                        }
                      })
                    }
                  })
              }
            })
          }
        })
      }
    })
  }
})

app.get('/admin/settings', function(req, res) {

  if (req.Admin === undefined) {
    res.redirect('/admin')
  } else {

    req.db.query(`SELECT * FROM Settings`, function(err, result, fields) {
      if (err) {
        console.log('error at getting settings')
        res.redirect('/404')
      } else {
        res.render('admin/settings', {
          admin: {
            email: req.Admin.adminEmail
          },
          settings: result[0]
        })
      }
    })
  }
})
/*
Used to update admin settings.
*/
app.post('/admin/settings/update', function(req, res) {
  if (req.Admin === undefined) {
    console.log('error u need to login')
    res.send('404')
  } else {

    var street = req.body.storeStreet;
    var city = req.body.storeCity;
    var state = req.body.storeState;
    var zipcode = req.body.storeZipcode;
    var facebook = req.body.storeFacebook;
    var twitter = req.body.storeTwitter;
    var linkedin = req.body.storeLinkedin;

    if (!zipcode || zipcode === 'Store Zipcode *') {
      console.log('error zipcode value')
      res.send('404')
    } else {

      req.db.query('SELECT * FROM Settings', function(err, result, fields) {
        if (err) {
          console.log('error at checking if settings exist')
        } else if (result.length === 0) {
          req.db.query(`INSERT INTO Settings VALUES('${street}', '${city}', '${state}', ` +
            `'${zipcode}', '${facebook}', '${twitter}', '${linkedin}')`,
            function(err1, result1, fields1) {
              if (err1) {
                console.log('error at inserting settings')
                res.send('404')
              } else {
                USPS.ZipOrigination = zipcode
                res.send('200')
              }
            })

        } else {
          req.db.query(`UPDATE Settings SET storeStreet='${street}', storeCity='${city}', storeState='${state}', ` +
            `storeZipcode='${zipcode}', storeFacebook='${facebook}', storeTwitter='${twitter}', storeLinkedin='${linkedin}'`,
            function(err2, result2, fields2) {
              if (err2) {
                console.log('error at updating settings')
                res.send('404')
              } else {
                USPS.ZipOrigination = zipcode
                res.send('200')
              }
            })
        }
      })
    }
  }
})


app.get('/admin/logout', function(req, res) {
  res.clearCookie('Admin')
  res.redirect('/admin')
})

app.post('/admin/products/remove/:id', function(req, res) {
  req.db.query(`DELETE FROM Products WHERE productID = '${req.params.id}'`, function(err, result, fields) {
    if (err) {
      console.log(err)
    } else {
      res.send("200 OK")
    }
  })
})
/*
Used when adding or editing products on the admin side.
*/
app.post('/admin/products/:id', uploadProductImage.single('productImage'), function(req, res) {

  var productID = req.body.productID
  var productName = req.body.productName
  var productDesc = req.body.productDesc
  var productWeight = req.body.productWeight
  var productPrice = req.body.productPrice
  var productImage = req.file

  if (req.params.id === 'add' && productName && productDesc && productWeight && productPrice && productImage) {

    req.db.query(`INSERT INTO Products(adminID, productName,` +
      `productDesc, productPrice, productWeight, productImage, productStatus)` +
      ` VALUES(${req.Admin.adminID},"${productName}", "${productDesc}",` +
      `${productPrice}, "${productWeight}",` +
      `"${productImage.path.replace('public', '')}", "In stock")`,
      function(err, result, fields) {
        if (err) {
          res.send("404")
          console.log(err)
          return
        }
        console.log("Product was added successfully")
        res.send({
          productID: result.insertId,
          productImage: productImage.path.replace('public', '')
        })
      })
  } else if (req.params.id === 'edit' && productID) {

    req.db.query(`UPDATE Products SET productName = '${productName}', ` +
      `productDesc = '${productDesc}', productWeight = ${productWeight}, ` +
      `productPrice = ${productPrice}` +
      `${productImage ? ', productImage="' + productImage.path.replace('public', '') + '"': ''}` +
      ` WHERE productID='${productID}'`,
      function(err, result, fields) {
        if (err) {
          res.send("404")
          console.log(err)
          return
        }
        console.log("Product was added successfully")
        res.send({
          productImage: productImage ? productImage.path.replace('public', '') : undefined
        })
      })
  } else {
    res.send('404')
  }
})
/*
User login/ signup page.
*/
app.get('/entry', function(req, res) {
  if (req.User === undefined) {
    res.render('index/entry')
  } else {
    res.redirect('/')
  }

})
/*
Used to process the user login post request.
*/
app.post('/login', function(req, res) {

  var email = req.body.email
  var password = req.body.password

  var permittedEmails = new RegExp(/^[._A-Za-z0-9-\\+]+(\\.[_A-Za-z0-9-]+)*@gmail|hotmail|yahoo|outlook.com$/i)
  var permittedPasswords = new RegExp(/\s/g)

  if (permittedEmails.test(email) &&
    !permittedPasswords.test(password) && password.length > 0) {

    req.db.query(`SELECT * FROM Users WHERE userEmail = '${email}'`, function(err, result, fields) {
      if (err) {
        console.log('req.db error at login')
        res.send('404')
      } else if (result.length == 0) {
        console.log('User not found')
        res.send('404')
      } else {

        bcrypt.compare(password, result[0].userPassword, function(err, status) {

          if (status === true) {

            crypto.randomBytes(24, (err, buf) => {

              if (err) {
                console.log('Random bytes error in login')
                res.send('404')
              } else {

                const algorithm = 'aes-192-cbc';
                const key = buf
                const iv = buf.slice(0, 16)
                const cipher = crypto.createCipheriv(algorithm, key, iv);

                let encrypted = '';
                cipher.on('readable', () => {
                  let chunk;
                  while (null !== (chunk = cipher.read())) {
                    encrypted += chunk.toString('hex');
                  }
                })

                cipher.on('end', () => {

                  req.db.query(`UPDATE Users SET loginSessionKey = "${buf.toString('hex')}" WHERE userID = ${result[0].userID}`, function(err, result2, fields) {
                    if (err) {
                      console.log(err)
                      res.send('404')
                    } else {
                      res.clearCookie('User')
                      res.cookie('User', {
                        "userID": result[0].userID,
                        "sessionToken": encrypted
                      }, {
                        expires: new Date(Date.now() + 7 * 24 * 3600000),
                        httpOnly: true
                      })
                      res.send('200')
                    }
                  })
                })
                cipher.write('' + result[0].userID);
                cipher.end();
              }
            })
          } else {
            console.log('invalid user login password')
            res.send('401')
          }
        })
      }
    })

  } else {
    console.log('didnt pass validation')
    res.send('404')
  }
})
/*
Used to process the user signup request.
*/
app.post('/signup', function(req, res) {

  var firstName = req.body.firstName
  var lastName = req.body.lastName
  var email = req.body.email
  var password = req.body.password

  var permittedNames = new RegExp(/^[a-zA-Z]+$/)
  var permittedEmails = new RegExp(/^[._A-Za-z0-9-\\+]+(\\.[_A-Za-z0-9-]+)*@gmail|hotmail|yahoo|outlook.com$/i)
  var permittedPasswords = new RegExp(/\s/g)

  if (permittedNames.test(firstName + lastName) &&
    permittedEmails.test(email) &&
    !permittedPasswords.test(password) && password.length > 0) {
    var saltRounds = 6 // regular user
    bcrypt.genSalt(saltRounds, function(err, salt) {
      bcrypt.hash(password, salt, function(err, hash) {

        req.db.query(`INSERT INTO Users(userFirstName, userLastName, userEmail, userPassword) VALUES('${firstName}', '${lastName}', '${email}', '${hash}')`, function(err, result, fields) {
          if (err) {
            console.log(err)
            res.send('400')
          } else {

            crypto.randomBytes(24, (err, buf) => {

              if (err) {
                console.log(err)
                res.send('404')

              } else {

                const algorithm = 'aes-192-cbc';
                const key = buf
                const iv = buf.slice(0, 16)
                const cipher = crypto.createCipheriv(algorithm, key, iv);

                let encrypted = '';
                cipher.on('readable', () => {
                  let chunk;
                  while (null !== (chunk = cipher.read())) {
                    encrypted += chunk.toString('hex');
                  }
                })

                cipher.on('end', () => {

                  req.db.query(`UPDATE Users SET loginSessionKey = "${buf.toString('hex')}" WHERE userID = ${result.insertId}`, function(err, result2, fields) {
                    if (err) {
                      console.log(err)
                      res.send('404')
                    } else {
                      res.cookie('User', {
                        "userID": result.insertId,
                        "sessionToken": encrypted
                      }, {
                        expires: new Date(Date.now() + 7 * 24 * 3600000),
                        httpOnly: true
                      })
                      res.send('200')
                    }
                  })
                })

                cipher.write(result.insertId.toString());
                cipher.end();
              }
            })
          }
        })
      })
    })
  } else {
    console.log('didnt pass validation')
    res.send('404')
  }
})
/*
Gets all orders purchased by a specific user.
*/
app.get('/account/orders', function(req, res) {


  if (req.User === undefined) {
    res.redirect('/entry')
  } else {
    req.db.query(`SELECT COUNT(*) AS cartSize FROM Carts WHERE userID = ${req.User.userID}`, function(err, result, fields) {
      if (err) {
        console.log("There was an error at account settings, getting user cart info")
        res.render('index/404')
      } else {
        req.db.query(`SELECT * FROM Orders WHERE userID = ${req.User.userID}`, function(err2, result2, fields2) {
          if (err2) {
            console.log('error at getting product ids in /account/orders')
            res.redirect('/404')
          } else if (result2.length > 0) {
            var productIDs = ""
            result2.forEach(e => productIDs += ',' + e.productIDs)

            req.db.query(`SELECT productID, productName, productImage, productPrice FROM Products WHERE productID IN (${productIDs.substr(1)})`, function(err3, result3, fields3) {
              if (err3) {
                console.log('error at getting each orders products')
                console.log(err3)
                res.redirect('/404')
              } else {
                result3.forEach(e => {

                  result2.forEach(e2 => {
                    if (e2.productIDs.includes(e.productID)) {
                      e.orderID = e2.orderID
                      e.orderStatus = e2.orderStatus
                      e.purchaseDate = e2.date.toString().split(' ').slice(0, 4).join(' ')
                    }
                  })
                })

                res.render('index/orders', {
                  userID: req.User.userID,
                  cart: {
                    size: result[0].cartSize
                  },
                  products: result3
                })
              }
            })

          } else {
            res.render('index/orders', {
              userID: req.User.userID,
              cart: {
                size: result[0].cartSize
              }
            })
          }
        })
      }
    })
  }
})

app.post('/account/orders/get-products/:ids', function(req, res) {

  if (req.User === undefined || req.params.ids === undefined) {
    res.send('404')
  } else {
    req.db.query(`SELECT * FROM Products WHERE productID IN (${req.params.ids})`, function(err, result, fields) {
      if (err) {
        console.log('erorr at getting orders products')
        res.send('404')
      } else {
        res.json(result)
      }
    })
  }
})
/*
Used to retrieve an order tracking information.
It uses USPS apis.
*/
app.post('/account/orders/track-order/:orderID', function(req, res) {

  if (req.User === undefined || req.params.orderID === undefined) {
    res.send('404')
  } else {

    req.db.query(`SELECT shippingNumber FROM Orders WHERE orderID = ${req.params.orderID}`, function(err, result, fields) {
      if (err) {
        console.log('error at getting order shipping number in tracking /post')
        console.log(err)
        res.send('404')
      } else {
        var trackingApi = USPS.api + `TrackV2&XML=` +
          `<TrackRequest USERID="${USPS.accessToken}">` +
          `<TrackID ID="${result[0].shippingNumber}">` +
          `</TrackID>` +
          `</TrackRequest>`

        axios.post(trackingApi).then(tr => {
          console.log(xml.xml2js(tr.data, {
            compact: true,
            spaces: 4
          }))
          res.json(xml.xml2js(tr.data, {
            compact: true,
            spaces: 4
          }))
        }).catch(err => {
          console.log('error')
          res.send('404')
        })
      }
    })
  }
})

app.get('/account/settings', function(req, res) {

  if (req.User === undefined) {
    res.redirect('/entry')
  } else {
    req.db.query(`SELECT * FROM Users WHERE userID = ${req.User.userID}`, function(err, result, fields) {

      if (err) {
        console.log("There was an error at account settings")
        res.render('index/404')
      } else if (result.length === 0) {
        res.clearCookie('User')
        res.redirect('/entry')
      } else {

        req.db.query(`SELECT COUNT(*) AS cartSize FROM Carts WHERE userID = ${req.User.userID}`, function(err2, result2, fields2) {
          if (err2) {
            console.log("There was an error at account settings, getting user cart info")
            res.render('index/404')
          } else {
            res.render('index/settings', {
              user: result[0],
              cart: {
                size: result2[0].cartSize
              },
              userID: req.User.userID
            })
          }
        })
      }
    })
  }
})
/*
Used to update user settings.
*/
app.post('/account/update-settings', function(req, res) {

  if (req.User === undefined) {
    res.send('400')
  } else {

    var firstName = req.body.firstName
    var lastName = req.body.lastName
    var phoneNumber = req.body.phoneNumber
    phoneNumber = phoneNumber == undefined ? 6666 : phoneNumber
    var street = req.body.street
    var city = req.body.city
    var state = req.body.state
    var zipCode = req.body.zipCode

    req.db.query(`UPDATE Users SET userFirstName = '${firstName}', userLastName = '${lastName}', ` +
      `${phoneNumber === 666 ? '': 'userPhoneNumber = ' + phoneNumber + ', '}` +
      `userStreet = '${street}', userCity = '${city}', userState = '${state}', userZipcode = ${zipCode}` +
      ` WHERE userID = ${req.User.userID}`,
      function(err, result, fields) {
        if (err) {
          console.log('Error at post updating settings')
          console.log(err)
          res.send('404')
        } else if (result.length === 0) {
          res.clearCookie('User')
          res.send('400')
        } else {
          res.send('200')
        }
      })
  }
})

app.get('/product/:id', function(req, res) {

  req.db.query(`SELECT * FROM Products WHERE productID = ${req.params.id}`, function(err, result, fields) {
    if (err) throw err;
    if (result[0] === undefined) {
      res.redirect('/404')

    }

    var outputParams = {
      product: result[0],
      cart: {
        size: 0
      }
    }

    if (req.User !== undefined) {

      req.db.query(`SELECT COUNT(*) AS cartSize FROM Carts WHERE userID = ${req.User.userID}`, function(err2, result2, fields2) {
        if (err2) {
          res.send('404')

        } else {
          outputParams.userID = req.User.userID
          outputParams.cart.size = result2[0].cartSize
          res.render('index/product-details', outputParams)

        }
      })
    } else {
      res.render('index/product-details', outputParams)
    }
  })
})
/*
Used to handle the add-to-cart post request.
All users carts are stored in the database, not cookies.
*/
app.post('/products/add-to-cart/:id', function(req, res) {
  if (req.User === undefined) {
    res.send('401')
  } else {
    req.db.query(`INSERT INTO Carts(userID, productID) VALUES(${req.User.userID}, ${req.params.id})`, function(err, result, fields) {
      if (err) {
        res.send('404')
      } else {
        res.send('200')
      }
    })
  }
})
/*
Delete product from cart
*/
app.post('/products/delete-from-cart/:id', function(req, res) {
  if (req.User === undefined) {
    res.send('401')
  } else {
    req.db.query(`DELETE FROM Carts WHERE userID = ${req.User.userID} AND productID = ${req.params.id}`, function(err, result, fields) {
      if (err) {
        res.send('404')
      } else {
        res.send('200')
      }
    })
  }
})
/*
Used to get and display products in the main page.
It supports pagination.
*/
app.get(['/', '/page/:n?'], function(req, res) {

  var pageNum = req.params.n
  if ((pageNum !== undefined && pageNum.replace(/[0-9]/g, '').length > 0) ||
    (req.originalUrl != '/' && pageNum === undefined)) {
    res.redirect('/404')
  } else {

    pageNum = pageNum === undefined ? 0 : parseInt(pageNum)

    req.db.query(`SELECT * FROM Products WHERE productStatus = 'In stock' ORDER BY insertionDate DESC LIMIT ${pageNum * 16}, 16`, function(err, result, fields) {
      if (err) {
        console.log(err)
        res.redirect('/404')
      } else if (result.length == 0 && req.originalUrl != '/') {
        res.redirect('/')
      } else {
        var randProducts = Math.floor(Math.random() * result.length)
        var numOfprods = 4
        var con = randProducts - numOfprods
        con = con < 0 ? 0 : con
        var resParams = {
          products: result,
          slideshow: result.slice(con, con + numOfprods),
          cart: {
            size: 0
          }
        }
        var userCartQuery = undefined
        if (req.User !== undefined) {
          userCartQuery = `(SELECT COUNT(*) FROM Carts WHERE userID = ${req.User.userID}) AS cartSize,`
          resParams.userID = req.User.userID
        }
        req.db.query(`SELECT ${userCartQuery === undefined ? '(SELECT 0) AS cartSize,': userCartQuery}` +
          `(SELECT COUNT(*) FROM Products WHERE productStatus = 'In stock') AS numberOfProducts FROM DUAL`,
          function(err2, result2, fields2) {
            if (err2) {
              console.log('Error getting number of products')
              console.log(err2)
              res.redirect('/404')
            } else {
              resParams.cart.size = result2[0].cartSize

              resParams.pages = {
                numberOfProducts: result2[0].numberOfProducts,
                currentPageNumber: pageNum
              }
              res.render('index/index', resParams)
            }
          })
      }
    })
  }
})

app.get('/logout', function(req, res) {

  res.clearCookie('User')
  res.redirect('/')

})

app.get('/404', function(req, res) {
  res.render('index/404')
})

app.get('/account/:p?', function(req, res) {
  if (req.User === undefined) {
    res.redirect('/entry')
  } else {
    res.redirect('/404')
  }
})

app.use(function(req, res, next) {
  if (req.db !== undefined) req.db.release()
  next()
})

app.get('*', function(req, res) {
  res.redirect('/404')
})

app.listen(3000)
