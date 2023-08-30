var express = require('express'),
    fs = require('fs'),
    url = require('url'),
    request = require('request'),
    path = require('path');

var app = express();
const STATIC_ROOT = path.join(__dirname, 'dist');

app.set('port', (process.env.APP_PORT || 4200));
app.set('config', {});

app.use(express.static('dist', { redirect: false }));

/* Allow self signed certificates */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

function fetch_config(){
    var config = {
        name: 'market-risk'
    };

    if(process.env.ANGULAR_CONFIG) {
        var path = path.join(process.env.ANGULAR_CONFIG, 'application.json');
        console.log('Reading config file ', path);
        if(fs.existsSyncpath()) {
            config = JSON.parse(fs.readFileSync(path, 'utf8'));
        }
    }

    app.set('config', config);

    if(process.env.CONFIG_SERVER && process.env.APP_NAME) {
        var uri = process.env.CONFIG_SERVER.replace(/\/$/, '');
        uri = `${uri}/${process.env.APP_NAME}-${process.env.SPRING_PROFILES_ACTIVE || 'development'}.json`;
        uri = new url.URL(uri);
        if(!uri.username.length) {
            if(process.env.CONFIG_USER) {
                uri.username = process.env.CONFIG_USER;
            }

            if(process.env.CONFIG_PASSWORD) {
                uri.password = process.env.CONFIG_PASSWORD ;
            }

            console.info(`Loading remote config : ${uri}`);

            var options = {
                url: uri.toString(),
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }

            request.get(options, (err, res, body) => {
                if(!err) {
                    var data = JSON.parse(body);
                    app.set('remote_config', data);
                    Object.assign(config, data.app);
                    app.set('config', config);
                }else{
                    console.error(err);
                }
            });
        }
    } 
}


fetch_config();

app.get('/config.json', function (req, res) {
    if(req.query.reload) {
        fetch_config();
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(app.get('config')));
});

app.get('/health', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({status: 'UP'}));
});

app.get('*', function (req, res, next) {
    res.sendFile(path.resolve('dist/index.html'));
});

app.listen(app.get('port'), function() {
    console.log('app running on port', app.get('port'));
});

