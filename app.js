const express = require("express");
const bodyparser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");
const mongoose = require("mongoose");
const exphbs = require("express-handlebars");
var jwt = require("jsonwebtoken");
const moment = require("moment");
const stripe = require("stripe")(
  "sk_test_51ITLh0KqdSYTqsLlXsxLFTgcTXKfTZYkxoZPIV08VpjCbCv6rLjhfsDkfkMPg2CU0HSaG7eZ1bGD0hVDi04nt0NA00FXnW4Mb7"
);
const customermodel = require("./module/customer");
const { MONGOURL } = require("./keys");

if (typeof localStorage == "undefined" || localStorage == null) {
  const Local = require("node-localstorage").LocalStorage;
  localStorage = new Local("./scratch");
}

const app = express();
mongoose.connect(MONGOURL, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on("connected", () => {
  console.log("connected");
});
mongoose.connection.on("error", (err) => {
  res.render("error", {
    msg: "Connect to the Internet. You're offline. Check your connection. ",
  });
});

app.engine(
  "handlebars",
  exphbs({ extname: "hbs", defaultLayout: false, layoutsDir: "views/ " })
);
app.set("view engine", "handlebars");

app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());

app.use("/public", express.static(path.join(__dirname, "public")));

app.get("/", function (req, res) {
  if (localStorage.getItem("email") && localStorage.getItem("phone")) {
    res.redirect("/details");
  }
  res.render("contact");
});

var email;

let transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 20,
  service: "Gmail",

  auth: {
    user: "avineykhetarpal01@gmail.com",
    pass: "kantarani",
  },
});

app.post("/send", function (req, res) {
  if (localStorage.getItem("email") && localStorage.getItem("phone")) {
    res.redirect("/details");
  }
  email = req.body.email;

  var otp = Math.random();
  otp = otp * 1000000;
  otp = parseInt(otp);

  var mailOptions = {
    to: req.body.email,
    subject: "Otp for registration is: ",
    html:
      "<h3>OTP for account verification is </h3>" +
      "<h1 style='font-weight:bold;'>" +
      otp +
      "</h1>" +
      "<b>OTP will expire in 2 minutes </b>", // html body
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      res.render("error", {
        msg:
          "Due to some network problem,request will not be proceded. Sorry for your inconvenience. ",
      });
    }
    var token = jwt.sign({ otp: otp }, "otpKey", { expiresIn: 60 * 2 });
    localStorage.setItem("otpKey", token);

    res.render("otp", {
      details: {
        phone: req.body.phone,
        email: req.body.email,
        lastname: req.body.lastname,
        firstname: req.body.firstname,
      },
    });
  });
});

app.post("/verify", function (req, res) {
  if (localStorage.getItem("email") || localStorage.getItem("phone")) {
    res.redirect("/details");
  }
  var token = localStorage.getItem("otpKey");
  try {
    jwt.verify(token, "otpKey", function (err, decoded) {
      if (err) {
        res.render("otp", {
          msg: "Otp expired",
          time: "danger",
          details: {
            phone: req.body.phone,
            email: req.body.email,
            lastname: req.body.lastname,
            firstname: req.body.firstname,
          },
        });
      }
      if (decoded.otp == req.body.otp) {
        localStorage.setItem("firstname", req.body.firstname);
        localStorage.setItem("lastname", req.body.lastname);
        localStorage.setItem("email", req.body.email);
        localStorage.setItem("phone", req.body.phone);

        res.redirect("/details");
      } else {
        res.render("otp", {
          msg: "Incorrect OTP!",
          time: "danger",
          details: {
            phone: req.body.phone,
            email: req.body.email,
            lastname: req.body.lastname,
            firstname: req.body.firstname,
          },
        });
      }
    });
  } catch (error) {
    res.render("otp", {
      msg: "Error fetchin OTP!",
      time: "danger",
      details: {
        phone: req.body.phone,
        email: req.body.email,
        lastname: req.body.lastname,
        firstname: req.body.firstname,
      },
    });
  }
});

app.post("/resend", function (req, res) {
  if (localStorage.getItem("email") || localStorage.getItem("phone")) {
    res.redirect("/details");
  }
  var otp = Math.random();
  otp = otp * 1000000;
  otp = parseInt(otp);
  var mailOptions = {
    to: req.body.email,
    subject: "Otp for registration is: ",
    html:
      "<h3>OTP for account verification is </h3>" +
      "<h1 style='font-weight:bold;'>" +
      otp +
      "</h1>" +
      "<b>OTP will expire in 2 minutes </b>", // html body
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      res.render("error", {
        msg:
          "Due to some network problem,request will not be proceded. Sorry for your inconvenience. ",
      });
    }
    var token = jwt.sign({ otp: otp }, "otpKey", { expiresIn: 60 * 2 });
    localStorage.setItem("otpKey", token);

    res.render("otp", {
      msg: "Otp has been sent",
      time: "success",
      details: {
        phone: req.body.phone,
        email: req.body.email,
        lastname: req.body.lastname,
        firstname: req.body.firstname,
      },
    });
  });
});

app.get("/details", function (req, res) {
  if (!localStorage.getItem("email") || !localStorage.getItem("phone")) {
    res.redirect("/");
  }
  var firstname = localStorage.getItem("firstname");
  var lastname = localStorage.getItem("lastname");
  res.render("location", { firstname: firstname, lastname: lastname });
});
app.post("/payment", function (req, res) {
  if (!req.body.products || !localStorage.getItem("firstname")) {
    res.redirect("/");
  }
  if(!req.body.products  || !req.body.brand){
    res.render("location");
  }
  else{
  const customer = new customermodel({
    firstname: localStorage.getItem("firstname"),
    lastname: localStorage.getItem("lastname"),
    email: localStorage.getItem("email"),
    phone: localStorage.getItem("phone"),
    product_category: req.body.products,
    product_brand: req.body.brand,
    address: req.body.location,
    mode_of_payment: req.body.payment,
  });
  customer.save((err, resp) => {
    if (err) {
      res.render("error", {
        msg:
          "Due to some network problem,request will not be proceded. Sorry for your inconvenience. ",
      });
    }
    if (resp) {
      if (resp.mode_of_payment == "cash") {
        localStorage.setItem("id", resp._id);
        localStorage.setItem("date", resp.date);

        res.redirect("/checkout");
      } else {
        localStorage.setItem("_id", resp._id);
        localStorage.setItem("_date", resp.date);
        localStorage.setItem("category", resp.product_category);
        localStorage.setItem("brand", resp.product_brand);

        res.redirect("/securepay");
      }
    }
  });}
});
app.get("/securepay", function (req, res) {
  if (!localStorage.getItem("_id") || !localStorage.getItem("brand")) {
    res.redirect("/");
  }
  res.render("online");

  // console.log(req.protocol + '://' + req.get('host') + req.originalUrl)
});

app.get("/checkout", function (req, res) {
  if (!localStorage.getItem("id")) {
    res.redirect("/");
  }
  var date = moment(localStorage.getItem("date")).format("dddd, MMMM Do YYYY, h:mm:ss a")
  res.render("cash", {
    id: localStorage.getItem("id"),
    time: date,
    name: localStorage.getItem("firstname"),
    email: localStorage.getItem("email"),
  });
});

app.post("/create-checkout-session", async (req, res) => {
  if (
    !localStorage.getItem("_id") ||
    !localStorage.getItem("brand") ||
    !req.body.data
  ) {
    res.redirect("/");
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "INR",
          product_data: {
            name: localStorage.getItem("category"),
            // brand:localStorage.getItem("brand"),
          },
          unit_amount: parseInt(req.body.data) * 100,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${
      req.protocol + "://" + req.get("host") + req.originalUrl
    }/success`,
    cancel_url: `${
      req.protocol + "://" + req.get("host") + req.originalUrl
    }/error`,
  });

  var del = customermodel.findByIdAndUpdate(localStorage.getItem("_id"), {
    money_received: parseInt(req.body.data),
    session_id: session.id,
  });
  del.exec((err, data) => {
    if (err) throw err;

    localStorage.setItem("successid", session.id);
    res.json({ id: session.id });
  });
});

app.get("/create-checkout-session/success", function (req, res) {
  if (
    !localStorage.getItem("_id") ||
    !localStorage.getItem("brand") ||
    !localStorage.getItem("successid")
  ) {
    res.redirect("/");
  }

  var date = moment(localStorage.getItem("_date")).format("dddd, MMMM Do YYYY, h:mm:ss a")
  res.render("cash", {
    id: localStorage.getItem("_id"),
    time: date,
    name: localStorage.getItem("firstname"),
    email: localStorage.getItem("email"),
  });
});
app.get("/create-checkout-session/error", function (req, res) {
  if (!localStorage.getItem("_id") || !localStorage.getItem("brand")) {
    res.redirect("/");
  }

  res.render("error", {
    msg:
      "Forgot to add something to your cart? Shop around then come back to pay!",
  });
});
app.get("/logout", function (req, res) {
  if (localStorage.getItem("email")) {
    localStorage.clear();
  }

  res.redirect("/");
});
app.get("/cart", function (req, res) {
  if (!localStorage.getItem("email") || !localStorage.getItem("phone")) {
    res.redirect("/");
  }
  var data = customermodel.find({
    firstname: localStorage.getItem("firstname"),
    lastname: localStorage.getItem("lastname"),
    email: localStorage.getItem("email"),
    phone: localStorage.getItem("phone"),
  });
  data.exec((err, dat) => {
    if (err) throw err;
    let list = dat.map((item)=>{
      return { mode_of_payment:item.mode_of_payment,product_category:item.product_category,
         product_brand:item.product_brand,date:moment(item.date).format(
          "DD/MM/YYYY"
        ),_id:item._id }
  });
  
    res.render("cart",{data:list})
  });
});
app.get("*", function (req, res) {
  res.render("error", {
    msg:
      "The page you are looking for might have been removed had its name changed or is temporarily unavailable.",
  });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`app is live at ${PORT}`);
});
