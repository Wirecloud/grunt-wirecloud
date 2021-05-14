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

const utils = require('./utils');
const ops = require('./operations');
const ConfigParser = require('wirecloud-config-parser');

const error = function error(done, grunt, e) {
    if (typeof e === 'string') {
        grunt.log.error(e);
    } else {
        grunt.log.error(e.message);
    }
    done(false);
};

const overwrite = function overwrite(file, instance, done, grunt, isPublic) {
    let configParser, content;
    try {
        content = utils.getConfigData(file);
        configParser = new ConfigParser({content: content, validate: true});
    } catch (e) {
        return error(done, grunt, e);
    }
    const configData = configParser.getData();

    // Check if MAC is already uploaded
    return ops.mac_exists(grunt, instance, configData.name, configData.vendor, configData.version)

    // Delete MAC if already uploaded
        .then(function (exists) {
            if (exists) {
                return ops.uninstall_mac(grunt, instance, configData.name, configData.vendor, configData.version);
            }
        })

    // Upload new MAC
        .then(ops.upload_mac.bind(null, grunt, instance, file, isPublic))

    // OK message and finish
        .then(function () {
            grunt.log.ok();
            done();
        })

    // Error catcher for all previous promises
        .catch(error.bind(null, done, grunt));
};

module.exports.execute = function execute(data, options, grunt, done) {

    if (typeof data.file !== 'string') {
        grunt.log.error('Missing info about the file to upload');
        return done(false);
    }

    const instance = grunt.option('target') ? grunt.option('target') : options.instance;
    const isPublic = grunt.option('public') ? grunt.option('public') : options.public;
    const msg = 'Uploading ' + data.file + ' to ' + instance + '... ';
    grunt.log.write(msg);


    if (options.overwrite) {
        return overwrite(data.file, instance, done, grunt, isPublic);
    } else {
        return ops.upload_mac(grunt, instance, data.file, isPublic).then(function () {
            grunt.log.ok();
            done();
        }, error.bind(null, done, grunt));
    }
};
