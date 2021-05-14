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

const AdmZip = require('adm-zip'),
    path = require('path'),
    jf = require('jsonfile');

const get_user_home = function get_user_home() {
    return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
};

module.exports.validate_no_empty = function validate_no_empty(value) {
    if (!value) {
        return 'A value is required.';
    }
    return true;
};

module.exports.get_config_file_name = function get_config_file_name() {
    return path.join(get_user_home(), '.wirecloudrc');
};

module.exports.read_config = function read_config() {
    const config_file = exports.get_config_file_name();

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
    let content, wgtData;
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
