/*
 * Copyright (c) 2015 CoNWeT Lab., Universidad Politécnica de Madrid
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

var Promise = require('es6-promise').Promise;
var fs = require('fs');
var request = require('request');

var auth = require('./authentication');

module.exports.upload_mac = function upload_mac(grunt, instance_name, file, isPublic) {

    return new Promise(function (resolve, reject) {
        auth.get_token(grunt, instance_name).then(function (instance_info) {
            var headers = {
                'Content-Type': 'application/octet-stream',
                'Authorization': 'Bearer ' + instance_info.token_info.access_token
            };

            try {
                headers['Content-Length'] = fs.statSync(file)['size'];
            } catch (e) {
                reject(e);
            }

            var users = isPublic ? '*' : '';
            var url = instance_info.url + '/api/resources?user_list=' + users;
            var stream = fs.createReadStream(file);
            stream.on('open', function () {
                stream.pipe(request.post({"url": url, "headers": headers}, function (error, response, body) {
                    if (error) {
                        reject("An error occurred while processing the post request: " + error.message);
                    } else if ([200, 201].indexOf(response.statusCode) === -1) {
                        reject(new Error('Unexpected error code: ' + response.statusCode));
                    } else {
                        resolve();
                    }
                }));
            });

            stream.on('error', reject);
        }, reject);
    });

};

module.exports.uninstall_mac = function uninstall_mac(grunt, instance_name, mac_name, mac_vendor, mac_version) {
    return new Promise(function (resolve, reject) {
        auth.get_token(grunt, instance_name).then(function (instance_info) {
            var headers = {
                'Accept': 'application/json',
                'Authorization': 'Bearer ' + instance_info.token_info.access_token
            };

            var url = instance_info.url + '/api/resource' +
                        '/' + mac_vendor +
                        '/' + mac_name +
                        '/' + mac_version +
                        '?affected=true';
            request.del({"url": url, "headers": headers}, function (error, response) {
                if (error) {
                    reject("An error occurred while processing the post request: " + error.message);
                } else if ([200, 201].indexOf(response.statusCode) === -1) {
                    reject(new Error('Unexpected error code: ' + response.statusCode));
                } else {
                    resolve();
                }
            });
        }, reject);
    });
};

module.exports.mac_exists = function mac_exists(grunt, instance_name, mac_name, mac_vendor, mac_version) {
    return new Promise(function (resolve, reject) {
        auth.get_token(grunt, instance_name).then(function (instance_info) {
            var headers = {
                'Accept': 'application/json',
                'Authorization': 'Bearer ' + instance_info.token_info.access_token
            };

            var url = instance_info.url + '/api/resource' +
                        '/' + mac_vendor +
                        '/' + mac_name +
                        '/' + mac_version;
            request.get({"url": url, "headers": headers}, function (error, response) {
                if (error) {
                    reject("An error occurred while processing the post request: " + error.message);
                } else if ([200].indexOf(response.statusCode) !== -1) {
                    resolve(true);
                }
                else if ([404].indexOf(response.statusCode) !== -1) {
                    resolve(false);
                }
                else {
                    reject(new Error('Unexpected error code: ' + response.statusCode));
                }
            });
        }, reject);
    });
};
