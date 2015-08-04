require('dotenv').load({
    path: __dirname + '/.env'
});

var request = require('request');
var cheerio = require('cheerio');
var fs      = require('fs');
var moment  = require('moment');

var loginDetails = {
    email: process.env.PACKT_EMAIL,
    password: process.env.PACKT_PASSWORD,
    op: 'Login',
    form_id: 'packt_user_login_form',
    form_build_id: ''
};
var url = 'https://www.packtpub.com/packt/offers/free-learning';
var loginError = 'Sorry, you entered an invalid email address and password combination.';
var getBookUrl;
var bookTitle;

//we need cookies for that, therefore let's turn JAR on
request = request.defaults({
    jar: true
});

function download(url, dest, cb) {
    var file = fs.createWriteStream(dest);
    request(url).pipe(file);
    file.on('finish', function() {
        log('Downloaded ' + dest);
        file.close(cb);
    });
}

// wrapper for log, easily add timestamp and/or other destinations
function log(msg) {
	var now = moment().format('YYYY-MM-DD HHSS');
	var msg = '[' + now + '] ' + msg;
	console.log(msg);
}

function grab() {
    log('----------- Packt Grab Started -----------');
    request(url, function(err, res, body) {
        if (err) {
            console.error('Request failed');
            log('----------- Packt Grab Done --------------');
            return;
        }

        var $         = cheerio.load(body);
        getBookUrl    = $('a.twelve-days-claim').attr('href');
        bookId        = getBookUrl.match(/claim\/(.*)\//)[1];
        bookTitle     = $('.dotd-title').text().trim();
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
                log('Book ID: ' + bookId);
                log('Claim URL: https://www.packtpub.com' + getBookUrl);
                log('----------- Packt Grab Done --------------');

                var pdfUrl = 'https://www.packtpub.com/ebook_download/' + bookId + '/pdf';
                var fileName = bookTitle + '.pdf';
                download(pdfUrl, fileName, function() {
                    log('----------- Download Done ----------------');
                })
            });
        });
    });
}

function downloadAll() {
    var ebooksUrl = 'https://www.packtpub.com/account/my-ebooks';

    log('--------- Download All Started -----------');
    request(ebooksUrl, function(err, res, body) {
        if (err) {
            console.error('Request failed');
            log('----------- Packt Grab Done --------------');
            return;
        }

        var $         = cheerio.load(body);
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

            request(ebooksUrl, function(err, res, body) {
                if (err) {
                    console.error('Request Error');
                    log('----------- Packt Grab Done --------------');
                    return;
                }

                var $ = cheerio.load(body);
                var $ebooks = $('.product-line[nid]');

                log('Downloading ' + $ebooks.length + ' books.');

                var bookId, pdfUrl, fileName, bookTitle, $book;
                $ebooks.each(function(i, element) {
                    $book     = $(this);
                    bookId    = $book.attr('nid');
                    bookTitle = $book.attr('title').replace(' [eBook]', '').trim();
                    bookTitle = bookTitle.replace(/:/g,'').replace(/ /g, '_')

                    pdfUrl    = 'https://www.packtpub.com/ebook_download/' + bookId + '/pdf';
                    fileName  = 'ebooks/' + bookTitle + '.pdf';

                    download(pdfUrl, fileName);
                });
            });
        });
    });
}


var args = process.argv.slice(2);
if (args[0] == undefined) {
    grab();
}
else if (args[0] === 'download-all') {
    downloadAll();
}
else {
    log('Invalid argument');
}