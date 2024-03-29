/*
 * Copyright (c) 2015 CoNWeT Lab., Universidad Politécnica de Madrid
 * Copyright (c) 2021 Future Internet Consulting and Development Solutions S.L.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

const inquirer = require('inquirer');
const request = require('request');
const jf = require('jsonfile');
const webdriver = require('selenium-webdriver');
const {until, Condition} = require('selenium-webdriver');
const URL = require('url');

const utils = require('./utils');

until.urlStartsWith = function urlStartsWith(base_url) {
    base_url = URL.parse(base_url);
    return new Condition(
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

const get_final_token_using_password_credentials = function get_final_token_using_password_credentials(grunt, instance_name, instance_info, url, username, password, redirect_uri) {
    return new Promise(function (resolve, reject) {
        const body = {
            'grant_type': 'password',
            'redirect_uri': redirect_uri,
            'username': username,
            'password': password
        };

        // Required for KeyRock 2.0
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + new Buffer(instance_info.client_id + ":" + instance_info.client_secret).toString('base64')
        };

        grunt.log.debug('Basic auth: ' + headers.Authorization);
        grunt.log.verbose.writeln('Requesting final token to ' + url + ' ...');
        request.post({url: url, headers: headers, form: body}, function (error, response, body) {
            if (error) {
                reject(error);
                return;
            }

            if (response.statusCode === 401) {
                reject('Invalid username or password');
                return;
            } else if (response.statusCode !== 200) {
                reject('Unexpected response from server');
                return;
            }

            const config = utils.read_config();
            const token_info = JSON.parse(body);
            token_info.expires_on = Date.now() + (token_info.expires_in - 20) * 1000;
            instance_info.token_info = token_info;
            grunt.log.debug('Token Info: ' + JSON.stringify(token_info));

            config.hosts[instance_name].token_info = token_info;
            //

            jf.writeFileSync(utils.get_config_file_name(), config, {spaces: 4});

            resolve(instance_info);
        });
    });
};

const get_final_token = function get_final_token(grunt, instance_name, instance_info, url, code, redirect_uri, resolve, reject) {
    const body = {
        'code': code,
        'grant_type': 'authorization_code',
        'client_id': instance_info.client_id,
        'client_secret': instance_info.client_secret,
        'redirect_uri': redirect_uri
    };

    grunt.log.verbose.writeln('Requesting final token...');
    request.post({url: url, form: body}, function (error, response, body) {
        if (error) {
            reject(error);
            return;
        }

        if (response.statusCode !== 200) {
            reject('Unexpected response from server');
            return;
        }

        const token_info = JSON.parse(body);
        token_info.expires_on = Date.now() + (token_info.expires_in - 20) * 1000;
        instance_info.token_info = token_info;
        grunt.log.debug('Token Info: ' + JSON.stringify(token_info));

        // Store auth info
        const config = utils.read_config();

        config.hosts[instance_name].token_info = token_info;
        jf.writeFileSync(utils.get_config_file_name(), config, {spaces: 4});
        //

        resolve(instance_info);
    });
};


const auth = function auth(grunt, instance_name, instance_info) {

    return new Promise(function (resolve, reject) {
        request.get(URL.resolve(instance_info.url, '.well-known/oauth'), function (error, response, body) {
            if (error || response.statusCode !== 200) {
                return reject();
            }

            const info = JSON.parse(body);
            let redirect_uri;

            if (Array.isArray(info.flows) && info.flows.indexOf("Resource Owner Password Credentials Grant") !== -1) {
                const questions = [
                    {
                        type: "input",
                        name: "username",
                        message: "Username:",
                        validate: utils.validate_no_empty
                    },
                    {
                        type: "password",
                        name: "password",
                        message: "Password:"
                    }
                ];

                grunt.log.writeln();
                inquirer.prompt(questions).then(function (answers) {
                    get_final_token_using_password_credentials(grunt, instance_name, instance_info, info.token_endpoint, answers.username, answers.password, redirect_uri).then(resolve, reject);
                });

            } else {
                redirect_uri = instance_info.redirect_uri;
                if (redirect_uri == null) {
                    redirect_uri = info.default_redirect_uri;
                }

                const auth_url = info.auth_endpoint + '?response_type=code&client_id=' + encodeURIComponent(instance_info.client_id) + '&redirect_uri=' + encodeURIComponent(redirect_uri);

                grunt.log.verbose.writeln("Redirect uri: " + redirect_uri);
                grunt.log.verbose.writeln("Redirecting to: " + auth_url);
                const driver = new webdriver.Builder()
                    .forBrowser('firefox')
                    .build();

                driver.get(auth_url);
                driver.wait(until.urlStartsWith(redirect_uri), 24 * 60 * 60 * 1000);
                driver.getCurrentUrl().then(function (current_url) {
                    driver.quit();
                    current_url = URL.parse(current_url, true);
                    const code = current_url.query.code;
                    grunt.log.debug('Code: ' + code);
                    get_final_token(grunt, instance_name, instance_info, info.token_endpoint, code, redirect_uri, resolve, reject);
                }, reject);
            }
        });
    });

};

const refresh_token = function refresh_token(grunt, instance_name, instance_info) {

    return new Promise(function (resolve, reject) {
        const url = URL.resolve(instance_info.url, '.well-known/oauth');
        grunt.log.verbose.writeln('Requesting OAuth2 details (' + url + ') ...');
        request.get(url.toString(), (error, response, info_body) => {
            if (error || response.statusCode !== 200) {
                reject(new Error("OAuth 2 configuration couldn't be retrieved from WireCloud server"));
                return;
            }

            const info = JSON.parse(info_body);
            const body = {
                'refresh_token': instance_info.token_info.refresh_token,
                'grant_type': 'refresh_token',
                'client_id': instance_info.client_id,
                'client_secret': instance_info.client_secret
            };

            const headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            };

            grunt.log.debug('Refreshing auth token');
            request.post({url: info.token_endpoint, headers: headers, form: body}, (error, response, body) => {
                if (error) {
                    reject(error);
                    return;
                }

                if (response.statusCode === 401) {
                    reject('expired refresh token');
                    return;
                } else if (response.statusCode !== 200) {
                    reject('Unexpected response from server while refresing access token: ' + response.statusCode);
                    return;
                }

                const config = utils.read_config();
                const token_info = JSON.parse(body);
                token_info.expires_on = Date.now() + (token_info.expires_in - 20) * 1000;
                instance_info.token_info = token_info;
                grunt.log.debug('Token Info: ' + JSON.stringify(token_info));

                config.hosts[instance_name].token_info = token_info;
                //

                jf.writeFileSync(utils.get_config_file_name(), config, {spaces: 4});

                resolve(instance_info);
            });
        });
    });

};

const create_instance_interactive = function create_instance_interactive(grunt, instance_name) {
    const questions = [
        {
            type: "input",
            name: "url",
            message: "WireCloud instance url:",
            default: "https://mashup.lab.fiware.org"
        },
        {
            type: "input",
            name: "client_id",
            message: "OAuth2 Client Id:",
            validate: utils.validate_no_empty
        },
        {
            type: "input",
            name: "client_secret",
            message: "OAuth2 Client Secret:",
            validate: utils.validate_no_empty
        }
    ];

    return inquirer.prompt(questions).then(function (answers) {
        const instance_info = {
            url: answers.url,
            client_id: answers.client_id,
            client_secret: answers.client_secret
        };

        // Store auth info
        const config = utils.read_config();
        if (typeof config.hosts !== 'object') {
            config.hosts = {};
        }

        config.hosts[instance_name] = instance_info;
        jf.writeFileSync(utils.get_config_file_name(), config, {spaces: 4});
        //

        return Promise.resolve(instance_info);
    });
};

const get_token = function get_token(grunt, instance_name) {

    if (process.env.WIRECLOUD_CATALOGUE_AUTH_TOKEN != null) {
        return Promise.resolve({token_info: {access_token: process.env.WIRECLOUD_CATALOGUE_AUTH_TOKEN}});
    }

    const config = utils.read_config();
    if (typeof config.hosts === 'object' && typeof config.hosts[instance_name] === 'object') {
        const instance_info = config.hosts[instance_name];
        if (typeof instance_info.token_info === 'object' && typeof instance_info.token_info.access_token === 'string') {
            if (instance_info.token_info.expires_on == null || instance_info.token_info.expires_on <= Date.now()) {
                return refresh_token(grunt, instance_name, instance_info);
            } else {
                return Promise.resolve(instance_info);
            }
        } else {
            return auth(grunt, instance_name, instance_info);
        }
    } else {
        grunt.log.writeln("\n");
        grunt.log.writeln(`${instance_name} instance is not configured yet. Creating it:`);
        return create_instance_interactive(grunt, instance_name).then((instance_info) => {
            return auth(grunt, instance_name, instance_info);
        });
    }
};
module.exports.get_token = get_token;
