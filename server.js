require('dotenv').load({
    path: __dirname + '/.env'
});

var request = require('request');
var cheerio = require('cheerio');
var moment  = require('moment');

var loginDetails = {
    email: process.env.PACKT_EMAIL,
    password: process.env.PACKT_PASSWORD,
    op: "Login",
    form_id: "packt_user_login_form",
    form_build_id: ""
};
var url = 'https://www.packtpub.com/packt/offers/free-learning';
var loginError = 'Sorry, you entered an invalid email address and password combination.';
var getBookUrl;
var bookTitle;

//we need cookies for that, therefore let's turn JAR on
request = request.defaults({
    jar: true
});

// wrapper for log, easily add timestamp and/or other destinations
function log(msg) {
    var now = moment().format('YYYY-MM-DD HHSS');
    var msg = '[' + now + '] ' + msg;
    console.log(msg);
}

log('----------- Packt Grab Started -----------');
request(url, function(err, res, body) {
    if (err) {
        console.error('Request failed');
        log('----------- Packt Grab Done --------------');
        return;
    }

    var $ = cheerio.load(body);
    getBookUrl = $("a.twelve-days-claim").attr("href");
    bookTitle = $(".dotd-title").text().trim();
    var newFormId = $("input[type='hidden'][id^=form][value^=form]").val();

    if (newFormId) {
        loginDetails.form_build_id = newFormId;
    }

    request.post({
        uri: url,
        headers: {
            'content-type': 'application/x-www-form-urlencoded'
        },
        body: require('querystring').stringify(loginDetails)
    }, function(err, res, body) {
        if (err) {
            console.error('Login failed');
            log('----------- Packt Grab Done --------------');
            return;
        };
        var $ = cheerio.load(body);
        var loginFailed = $("div.error:contains('"+loginError+"')");
        if (loginFailed.length) {
            console.error('Login failed, please check your email address and password');
            log('Login failed, please check your email address and password');
            log('----------- Packt Grab Done --------------');
            return;
        }

        request('https://www.packtpub.com' + getBookUrl, function(err, res, body) {
            if (err) {
                console.error('Request Error');
                log('----------- Packt Grab Done --------------');
                return;
            }

            var $ = cheerio.load(body);

            log('Book Title: ' + bookTitle);
            log('Claim URL: https://www.packtpub.com' + getBookUrl);
            log('----------- Packt Grab Done --------------');
        });
    });
});
