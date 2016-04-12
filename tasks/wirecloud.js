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

'use strict';

var utils = require('./lib/utils');
var ConfigParser = require('wirecloud-config-parser');

module.exports = function (grunt) {

    function error (done, e) {
        if (typeof e === 'string') {
            grunt.verbose.error().error(e);
        } else {
            grunt.verbose.error().error(e.message);
        }
        grunt.log.error('Error overwriting mashable application component.');
        done(false);
    }

    grunt.registerMultiTask('wirecloud', 'Upload Mashable Application Components to a wirecloud instance.', function() {
        var done = this.async();

        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
            reporterOutput: null,
            instance: 'fiwarelab',
            overwrite: false
        });

        if (typeof this.data.file !== 'string') {
            grunt.log.error('Missing info about the file to upload');
            return done(false);
        }

        var instance = grunt.option('target') ? grunt.option('target') : options.instance;
        var msg = 'Uploading ' + this.data.file + ' to ' + instance + '... ';
        grunt.log.write(msg);
        var content = utils.getConfigData(this.data.file);

        if (options.overwrite) {
            var configParser;
            try {
                configParser = new ConfigParser({content: content, validate: true});
            } catch (e) {
                error(done, e);
            }
            var configData = configParser.getData();

            // Check if MAC is already uploaded
            utils.mac_exists(grunt, instance, configData.name, configData.vendor, configData.version).then(function (exists) {
                return exists;
            })

            // Delete MAC if already uploaded
            .then(function (exists) {
                if (exists) {
                    return utils.delete_mac(grunt, instance, configData.name, configData.vendor, configData.version);
                }
            })

            // Upload new MAC
            .then(utils.upload_mac.bind(this, grunt, instance, this.data.file))

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
            utils.upload_mac(grunt, options.instance, this.data.file).then(function () {
                grunt.log.ok();
                done();
            }, error.bind(null, done));
        }


    });

};
