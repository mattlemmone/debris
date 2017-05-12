var request = require('request');
var Q = require('q');
var http = require('http');
var fs = require('fs');
var Web = {};
var token = require('./token');

/* URLs */
var baseUrl = 'https://api.real-debrid.com/rest/1.0/';
var path = require('./path');

/* Headers */
var authHeader = {
    'Authorization': 'Bearer ' + token
};

var formHeader = {
    'Content-Type': 'x-www-form-urlencoded'
};


Web.get = function(_path, _headers, _expectedCode) {
    if (!_expectedCode) _expectedCode = 200;

    var deferred = Q.defer();
    var headers = authHeader;

    //Add all headers
    for (h in _headers) {
        Object.assign(headers, _headers[h]);
    }

    var reqOptions = {
        url: baseUrl + _path,
        headers: headers
    };

    request(reqOptions, function(error, response, body) {
        if (!error && response.statusCode == _expectedCode) {
            if (!body) deferred.resolve();
            else deferred.resolve(JSON.parse(body));
        } else {
            deferred.reject(JSON.parse(body));
        }
    });

    return deferred.promise;
}

Web.post = function(_path, _headers, _formData, _expectedCode) {
    if (!_expectedCode) _expectedCode = 201;

    var deferred = Q.defer();

    var headers = authHeader;
    Object.assign(headers, formHeader);

    var reqOptions = {
        url: baseUrl + _path,
        headers: headers,
        form: _formData
    };

    request.post(reqOptions, function(error, response, body) {
        if (!error && response.statusCode == _expectedCode) {
            if (!body) deferred.resolve();
            else deferred.resolve(JSON.parse(body));
        } else {
            deferred.reject(JSON.parse(body));
        }
    })

    return deferred.promise;
}

Web.download = function(url, cb) {
    var r = http.get(url, function(response) {
        var filename = response.connection.parser.outgoing.path;
        filename = filename.substr(filename.lastIndexOf('/') + 1);
        filename = decodeURI(filename);

        var error;
        var destPath = '../streamable/';
        var isRar = false;

        if (filename.includes('.rar')) {
            destPath = '../downloads/';
            isRar = true;
        }

        if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath);
        }

        var file = fs.createWriteStream(destPath + filename);
        response.pipe(file);
        file.on('finish', function() {
            file.close(cb(error, isRar, filename)); // close() is async, call cb after close completes.
        });
    })

    r.on('error', function(err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        if (cb) cb(err.message);
    });


    r.on('response', function(res) {
        console.log('in cb');
        var len = parseInt(res.headers['content-length'], 10);
        var downloaded = 0;

        res.on('data', function(chunk) {
            downloaded += chunk.length;
            console.log("Downloading " + (100.0 * downloaded / len).toFixed(2) + "% ");
        })
    })
}

module.exports = Web;
