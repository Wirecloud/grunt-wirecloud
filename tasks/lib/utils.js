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

var AdmZip = require('adm-zip'),
    path = require('path'),
    jf = require('jsonfile'),
    ConfigParser = require('wirecloud-config-parser');

var error = function error(done, grunt, e) {
    if (typeof e === 'string') {
        grunt.log.error().error(e);
    } else {
        grunt.log.error().error(e.message);
    }
    done(false);
};

var validate_no_empty = function validate_no_empty(value) {
    if (value === '') {
        return 'A value is required.';
    }
    return true;
};


var get_user_home = function get_user_home() {
    return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
};

module.exports.get_config_file_name = function get_config_file_name() {
    return path.join(get_user_home(), '.wirecloudrc');
};

module.exports.read_config = function read_config() {
    var config_file = exports.get_config_file_name();

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

module.exports.getConfigData = function getConfigData(configPath) {
    var content, wgtData;
    try {
        wgtData = new AdmZip(configPath);
    } catch (e) {
        throw e;
    }
    wgtData.getEntries().forEach(function (entry) {
        if (entry.entryName === 'config.xml') {
            content = entry.getData().toString();
        }
    });
    if (!content) {
        throw new Error('Zip file did not contain a config.xml file');
    }
    return content;
};

module.exports.execute = function execute(data, options, grunt, done) {

    if (typeof data.file !== 'string') {
        grunt.log.error('Missing info about the file to upload');
        return done(false);
    }

    var instance = grunt.option('target') ? grunt.option('target') : options.instance;
    var msg = 'Uploading ' + data.file + ' to ' + instance + '... ';
    grunt.log.write(msg);
    var content = null;
    try {
        content = module.getConfigData(data.file);
    } catch (e) {
        return error(done, grunt, e);
    }

    if (options.overwrite) {
        var configParser;
        try {
            configParser = new ConfigParser({content: content, validate: true});
        } catch (e) {
            error(done, grunt, e);
        }
        var configData = configParser.getData();

        // Check if MAC is already uploaded
        module.mac_exists(grunt, instance, configData.name, configData.vendor, configData.version).then(function (exists) {
            return exists;
        })

        // Delete MAC if already uploaded
        .then(function (exists) {
            if (exists) {
                return module.uninstall_mac(grunt, instance, configData.name, configData.vendor, configData.version);
            }
        })

        // Upload new MAC
        .then(module.upload_mac(grunt, instance, data.file, options.public))

        // OK message and finish
        .then(function () {
            grunt.log.ok();
            done();
        })

        // Error catcher for all previous promises
        .catch(error.bind(null, done));
    }

    // overwrite: false
    else {
        module.upload_mac(grunt, instance, data.file, options.public).then(function () {
            grunt.log.ok();
            done();
        }, error.bind(null, done));
    }
};
