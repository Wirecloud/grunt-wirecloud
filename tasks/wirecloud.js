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

var utils = require('./utils');

module.exports = function (grunt) {

    grunt.registerMultiTask('wirecloud', 'Upload Mashable Application Components to a wirecloud instance.', function() {
        var done = this.async();

        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
            force: false,
            reporterOutput: null,
            instance: 'fiwarelab'
        });

        // don't fail if there are problems uploading the MAC
        var force = options.force;
        delete options.force;

        var msg = 'Uploading ' + this.data.file + ' to ' + options.instance + '... ';
        grunt.log.write(msg);
        utils.upload_mac(grunt, options.instance, this.data.file).then(function () {
            grunt.log.ok();
            done();
        }, function (e) {
            if (typeof e === 'string') {
                grunt.verbose.error().error(e);
            } else {
                grunt.verbose.error().error(e.message);
            }
            grunt.log.error('Error uploading mashable application component.');
            done(false);
        });
    });

};
