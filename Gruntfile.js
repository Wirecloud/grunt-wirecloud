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

'use strict';

module.exports = (grunt) => {

    // Project configuration.
    grunt.initConfig({

        eslint: {
            grunt: {
                src: "Gruntfile.js"
            },
            plugin: {
                src: "tasks/**/*.js"
            },
            specs: {
                options: {
                    configFile: ".eslintrc-mocha",
                },
                src: 'test/**/*.spec.js',
            }
        },

        clean: {
            coverage: {
                src: ['coverage/']
            }
        },

        mocha_istanbul: {
            coverage: {
                src: 'test', // a folder works nicely
                options: {
                    mask: 'main.spec.js'
                }
            }
        },

        mochaTest: {
            test: {
                options: {
                    reporter: 'spec'
                },
                src: ['test/main.spec.js']
            }
        }

    });

    // Actually load this plugin's task(s).
    grunt.loadTasks('tasks');

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks("gruntify-eslint");
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-mocha-istanbul');
    grunt.loadNpmTasks('grunt-mocha-test');


    grunt.registerTask('test', [
        'clean',
        'mocha_istanbul'
    ]);

    // Run 'node-debug grunt debug' to debug the code
    // NOTE: This requires node-inspector to be installed
    grunt.registerTask('debug', ['mochaTest']);

    // By default, lint and run all tests.
    grunt.registerTask('default', [
        'eslint',
        'test'
    ]);

};
