var restify = require('restify');
var pirata = require('pirata');
var Unrar = require('unrar');
var fs = require('fs');

var RealDebrid = require('./api/real-debrid');

var server = restify.createServer();

//Use req.params
server.use(restify.bodyParser({ mapParams: true }));

server.post('/search', function(req, res, next) {
    console.log(req.body.query);

    if (!req.params.query) return;
    pirata.search(req.params.query, function(error, response) {
        console.log(error, response)
        if (!error) res.send(response)
        else res.send(error)
    });
});

server.post('/select', function(req, res, next) {
    console.log(req.body.magnet);

    if (!req.params.magnet) return;

    var m = req.params.magnet;
    RealDebrid.downloadMagnet(m).then(function(data) {
        console.log(data);
        processDownload(data.error, data.isRar, data.filename);
    });
});

server.post('/playFile', function(req, res, next) {
    console.log(req.body.filename);
    var destPath = '../streamable/';
    if (!req.params.filename) return;
    fs.readdir('../streamable', (err, files) => {
        //see if filename is in files array
        //if not, error
        //if so, cast(destPath + filename)
    })
})


server.get('/getFiles', function(req, res, next) {
    fs.readdir('../streamable', (err, files) => {
        res.send(files); 
    })
})


function processDownload(error, isRar, filename) {

    var archive = new Unrar('../downloads/' + filename);

    archive.list(function(err, entries) {
        console.log(err, entries)
        var destPath = '../streamable/';
        var destFile;

        if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath);
        }

        for (e in entries) {
            var isMatch = entries[e].name.match(".*\.(mkv|mp4)");
            if (!isMatch) continue;

            //Clean up name
            destFile = entries[e].name;
            destFile = destFile.substr(destFile.lastIndexOf('\\') + 1);
            destFile = decodeURI(destFile);

            //Unzip file
            console.log('Unzipping ' + filename + '...');
            var stream = archive.stream(entries[e].name);
            stream.on('error', console.error);
            stream.pipe(fs.createWriteStream(destPath + destFile));

            //Exit after single match (for now)
            break;
        }

        castToTV(destPath + destFile);
    });
}

function castToTV(filePath) {
    const child_process = require('child_process');

    //If windows...
    child_process.execSync('start cmd.exe /K node node_modules/castnow/index.js ' + filePath);
}


server.listen(3000)
