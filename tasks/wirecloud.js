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

const task = require('./lib/task');

module.exports = function (grunt) {

    grunt.registerMultiTask('wirecloud', 'Upload Mashable Application Components to a wirecloud instance.', function () {
        const done = this.async();

        // Merge task-specific and/or target-specific options with these defaults.
        const options = this.options({
            reporterOutput: null,
            instance: 'fiwarelab',
            overwrite: false,
            public: null
        });

        task.execute(this.data, options, grunt, done);

    });

};
