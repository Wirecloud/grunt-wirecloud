const webdriver = require('selenium-webdriver'),
    By = require('selenium-webdriver').By,
    until = require('selenium-webdriver').until,
    URL = require('url'),
    request = require('request'),
    path = require('path'),
    jf = require('jsonfile'),
    fs = require('fs');


until.urlStartsWith = function urlStartsWith(base_url) {
    base_url = URL.parse(base_url);
    return new until.Condition(
        '',
        function (driver) {
            return driver.getCurrentUrl().then(function (current_url) {
                current_url = URL.parse(current_url);
                return current_url.protocol === base_url.protocol &&
                    current_url.host === base_url.host &&
                    current_url.pathname === base_url.pathname;
            });
        }
    );
};

var get_user_home = function get_user_home() {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
};

var get_config_file_name = function get_config_file_name() {
    return path.join(get_user_home(), '.wirecloudrc');
};

var read_config = function read_config() {
    var config_file = get_config_file_name();

    try {
        return jf.readFileSync(config_file);
    } catch (e) {
        if (e.code === 'ENOENT') {
            return {};
        } else {
            throw e;
        }
    }
};

var get_final_token = function get_final_token(instance_name, instance_info, url, code, redirect_uri, resolve, reject) {
    var body = {
        'code': code,
        'grant_type': 'authorization_code',
        'client_id': instance_info.client_id,
        'client_secret': instance_info.client_secret,
        'redirect_uri': redirect_uri
    };
    request({method: 'POST', url: url, form: body}, function (error, response, body) {
        if (error || response.statusCode != 200) {
            reject();
            return;
        }

        var config = read_config();
        var token_info = JSON.parse(body);

        // Store auth info
        if (typeof config.hosts !== 'object') {
            config.hosts = {};
        }

        if (typeof config.hosts[instance_name] !== 'object') {
            config.hosts[instance_name] = instance_info;
        }
        config.hosts[instance_name].token_info = token_info;
        //

        jf.writeFileSync(get_config_file_name(), config);

        resolve(instance_info);
    });
};


var auth = function auth(instance_name, instance_info) {

    return new Promise(function (resolve, reject) {
        request(URL.resolve(instance_info.url, '.well-known/oauth'), function (error, response, body) {
            if (error || response.statusCode != 200) {
                reject();
                return;
            }

            var info = JSON.parse(body);

            redirect_uri = instance_info.redirect_uri;
            if (redirect_uri == null) {
                redirect_uri = info.default_redirect_uri;
            }

            auth_url = info.auth_endpoint + '?response_type=code&client_id=' + encodeURIComponent(instance_info.client_id) + '&redirect_uri=' + encodeURIComponent(redirect_uri);

            console.log("Redirect uri: " + redirect_uri);
            console.log("Redirecting to: " + auth_url);
            var driver = new webdriver.Builder()
                .forBrowser('firefox')
                .build();

            driver.get(auth_url);
            driver.wait(until.urlStartsWith(redirect_uri), 24*60*60*1000);
            driver.getCurrentUrl().then(function (current_url) {
                driver.quit();
                current_url = URL.parse(current_url, true);
                var code = current_url.query.code;
                console.log('Code: ' + code);
                get_final_token(instance_name, instance_info, info.token_endpoint, code, redirect_uri, resolve, reject);
            }, reject);
        });
    });

};

module.exports.create_instance = function create_instance(instance_name, url, client_id, client_secret, resolve, reject) {
    var instance_info = {
        url: url,
        client_id: client_id,
        client_secret: client_secret
    };

    auth(instance_name, instance_info).then(resolve, reject);
};

var get_token = function get_token(instance_name) {
    
    var config = read_config();
    if (typeof config.hosts === 'object' && typeof config.hosts[instance_name] === 'object') {
        var instance_info = config.hosts[instance_name];
        return new Promise(function (resolve, reject) {
            if (typeof instance_info.token_info === 'object' && typeof instance_info.token_info.access_token === 'string') {
                resolve(instance_info);
            } else {
                auth(instance_name, instance_info).then(resolve, reject);
            }
        });
    } else {
        throw new Error('Invalid instance');
    }
};
module.exports.get_token = get_token;

module.exports.upload_mac = function upload_mac(instance_name, file) {

    return new Promise(function (resolve, reject) {
        get_token(instance_name).then(function (instance_info) {
            var headers = {
                'Content-Type': 'application/octet-stream',
                'Authorization': 'Bearer ' + instance_info.token_info.access_token,
                'Content-Length': fs.statSync(file)['size']
            };

            var url = URL.resolve(instance_info.url, 'api/resources');
            fs.createReadStream(file).pipe(request.post({"url": url, "headers": headers}, function (error, response, body) {
                console.log(body);
                if (error || [200, 201].indexOf(response.statusCode) === -1) {
                    reject();
                } else {
                    resolve();
                }
            }));
        }, reject);
    });

};
