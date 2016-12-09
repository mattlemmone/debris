var request = require('request');
var Q = require('q');
var token = require('./token');

var authHeader = {
    'Authorization': 'Bearer ' + token
};

var formHeader = {
    'Content-Type': 'x-www-form-urlencoded'
};

var baseUrl = 'https://api.real-debrid.com/rest/1.0/';

var path = {
    download: 'downloads',
    torrent: {
        all: 'torrents',
        info: 'torrents/info/',
        selectFiles: 'torrents/selectFiles/',
        add: {
            magnet: 'torrents/addMagnet'
        }
    },
    unrestrict: {
        link: 'unrestrict/link'
    },
    stream: {
        info: 'streaming/mediaInfos',
        transcode: 'streaming/transcode'
    }
};

var RealDebrid = {
    downloads: {},
    streaming: {},
    torrents: {},
    unrestrict: {}
};

var Web = {};


/* Downloads */
RealDebrid.downloads.getAll = function() {
    var deferred = Q.defer();

    var reqOptions = {
        url: baseUrl + path.download,
        headers: authHeader
    };

    request(reqOptions, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            deferred.resolve(JSON.parse(body));
        } else {
            deferred.reject(body);
        }
    });

    return deferred.promise;
}

/* Streaming */

/* Torrents */
RealDebrid.torrents.addMagnet = function(_magnetUrl) {
    var deferred = Q.defer();

    var headers = authHeader;
    Object.assign(headers, formHeader);

    var reqOptions = {
        url: baseUrl + path.torrent.add.magnet,
        headers: headers,
        form: { magnet: _magnetUrl }
    };

    request.post(reqOptions, function(error, response, body) {

        if (!error && response.statusCode == 201) {
            deferred.resolve(body);
        } else {
            deferred.reject(body);
        }
    })

    return deferred.promise;
}

RealDebrid.torrents.getAll = function() {
    var deferred = Q.defer();

    var reqOptions = {
        url: baseUrl + path.torrent.all,
        headers: authHeader
    };

    request(reqOptions, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            deferred.resolve(JSON.parse(body));
        } else {
            deferred.reject(body);
        }
    });

    return deferred.promise;
}

RealDebrid.torrents.getTorrentInfo = function(_id) {
    var deferred = Q.defer();

    var reqOptions = {
        url: baseUrl + path.torrent.info + _id,
        headers: authHeader
    };

    request(reqOptions, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            deferred.resolve(JSON.parse(body));
        } else {
            deferred.reject(error);
        }
    });

    return deferred.promise;
}

RealDebrid.torrents.selectFiles = function(_torrentInfo) {
    var deferred = Q.defer();

    var headers = authHeader;
    Object.assign(headers, formHeader);

    var reqOptions = {
        url: baseUrl + path.torrent.selectFiles + _torrentInfo.id,
        headers: headers,
        form: { files: "all" }
    };

    request.post(reqOptions, function(error, response, body) {

        if (!error && response.statusCode == 204) {
            deferred.resolve(body);
        } else {
            deferred.reject(body);
        }
    });

    return deferred.promise;
}

RealDebrid.torrents.getTorrentProgress = function(_id) {
    var deferred = Q.defer();
    RealDebrid.torrents.getTorrentInfo(_id).then(function(torrent) {
        deferred.resolve({
            progress: torrent.progress,
            status: torrent.status,
            link: torrent.links ? torrent.links[0] : null
        });
    });
    return deferred.promise;
}

/* Unrestrict */
RealDebrid.unrestrict.getLink(_link) = function {
    var deferred = Q.defer();

    var headers = authHeader;
    Object.assign(headers, formHeader);

    var reqOptions = {
        url: baseUrl + path.unrestrict.link,
        headers: headers,
        form: { link: _link }
    };

    request.post(reqOptions, function(error, response, body) {
        //This is supposed to be 200
        if (!error && response.statusCode == 200) {
            deferred.resolve(body);
        } else {
            deferred.reject(body);
        }
    })

    return deferred.promise;
}

/* Utilities */
Web.get = function(_path, _headers, _expectedCode) {
    if (!_expectedCode) _expectedCode = 200;

    var deferred = Q.defer();
    var headers = authHeader;

    //Add all headers
    for (h in _headers){
        Object.assign(headers, _headers[h]);
    }

    var reqOptions = {
        url: baseUrl + _path,
        headers: headers
    };

    request(reqOptions, function(error, response, body) {
        if (!error && response.statusCode == _expectedCode) {
            deferred.resolve(JSON.parse(body));
        } else {
            deferred.reject(body);
        }
    });

    return deferred.promise;
}

getTorrentProgress("VRVTCOPQINXLQ").then(function(torrents) {
    unrestrictLink(torrents.link).then(function(d) {
        console.log(d)
    }).catch(function(error) {
        console.log('error', error);
    });

}).catch(function(error) {
    console.log('error', error);
});
