/* NPM includes */
var Q = require('q');

//var castnow = require('castnow');

/* Local includes */
var Web = require('./Web');
var path = require('./path');

/* APIs */
var RealDebrid = {
    downloads: {},
    streaming: {},
    torrents: {},
    unrestrict: {},
    interface: {}
};

/* Downloads */
RealDebrid.downloads.getAll = function() {
    return Web.get(path.download);
}

/* Streaming */
RealDebrid.streaming.getTranscodingLinks = function(_linkInfo, _codec) {
    var output = Web.get(path.stream.transcode + _linkInfo.id);
    if (_codec && output.hasOwnProperty(_codec)) output = output[_codec];
    return output;
}

/* Torrents */
RealDebrid.torrents.addMagnet = function(_magnetUrl) {
    var form = { magnet: _magnetUrl };
    return Web.post(path.torrent.add.magnet, [], form);
}

RealDebrid.torrents.getAll = function() {
    return Web.get(path.torrent.all);
}

RealDebrid.torrents.getInfo = function(_id) {
    return Web.get(path.torrent.info + _id);
}

/* Return torrent ID */
RealDebrid.torrents.selectFiles = function(_torrentInfo) {
    var deferred = Q.defer();
    var form = { files: "all" };
    var expectedCode = 204;
    Web.post(path.torrent.selectFiles + _torrentInfo.id, [], form, expectedCode).then(function() {
        deferred.resolve(_torrentInfo.id);
    });
    return deferred.promise;
}

RealDebrid.torrents.getProgress = function(_id) {
    var deferred = Q.defer();
    RealDebrid.torrents.getInfo(_id).then(function(torrent) {
        deferred.resolve({
            progress: torrent.progress,
            status: torrent.status,
            link: torrent.links ? torrent.links[0] : null
        });
    });
    return deferred.promise;
}

RealDebrid.torrents.waitforDownload = function(_id) {
    var deferredOuter = Q.defer();
    var progress = 0;
    var link;

    function conditionP() {
        var deferred = Q.defer();
        RealDebrid.torrents.getProgress(_id).then(function(data) {
            console.log('Torrent progress:', data.progress);

            progress = data.progress;

            if (progress == 100) {
                deferred.resolve(true);
                link = data.link;
            } else deferred.resolve(false)
        });
        return deferred.promise;
    }

    function work() {
        return Q.delay(5000); // arbitrary async
    }

    promiseWhilePromise(conditionP, work).then(function() {
        deferredOuter.resolve(link);
    }).done();

    return deferredOuter.promise;
}

/* Upload magnet link, wait for torrent completion, unrestrict file, return link info*/
RealDebrid.torrents.uploadMagnet = function(_magnetUrl) {
    var deferred = Q.defer();

    RealDebrid.torrents.addMagnet(_magnetUrl)
        .then(RealDebrid.torrents.selectFiles)
        .then(RealDebrid.torrents.waitforDownload)
        .then(RealDebrid.unrestrict.getLink)
        .then(function(linkInfo) {
            deferred.resolve(linkInfo);
        });

    return deferred.promise;
}

/* Unrestrict */
RealDebrid.unrestrict.getLink = function(_link) {
    var form = { link: _link };
    var expectedCode = 200;
    return Web.post(path.unrestrict.link, [], form, expectedCode);
}

/* Interface */
RealDebrid.interface.transcodeMagnet = function(_magnetUrl) {
    var deferred = Q.defer();

    RealDebrid.torrents.uploadMagnet(_magnetUrl).then(function(fileInfo) {
        if (!fileInfo.streamable) {

            deferred.reject({ error: 'Not a streamable filetype!', type: fileInfo.mimeType });
        }

        var codec = 'liveMP4;'

        RealDebrid.streaming.getTranscodingLink(fileInfo)
            .then(function(links) {
                console.log(links)
                Q.resolve(links);
            })
    });

    return deferred.promise;
}

RealDebrid.interface.downloadMagnet = function(_magnetUrl) {
    var deferred = Q.defer();

    RealDebrid.torrents.uploadMagnet(_magnetUrl).then(function(fileInfo) {
        Web.download(fileInfo.download, function(error, isRar, filename) {
            deferred.resolve({
                error: error,
                isRar: isRar,
                filename: filename
            });
        });
    });

    return deferred.promise;
}

/* Utilities */
function promiseWhilePromise(condition, body) {
    var deferred = Q.defer();

    function loop() {
        condition().then(function(bool) {
            if (bool) {
                return deferred.resolve();
            } else {
                return Q.when(body(), loop, deferred.reject);
            }
        });
    }

    // Start running the loop in the next tick so that this function is
    // completely async. It would be unexpected if `body` was called
    // synchronously the first time.
    Q.nextTick(loop);

    return deferred.promise;
}

module.exports = RealDebrid.interface;