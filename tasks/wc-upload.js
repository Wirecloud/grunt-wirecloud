'use strict';

module.exports = function (grunt) {

    grunt.registerMultiTask('wc-upload', 'Upload Mashable Application Components to a wirecloud instance.', function() {
        var done = this.async();

        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
            force: false,
            reporterOutput: null,
            url: 'https://mashup.lab.fiware.org'
        });

        // don't fail if there are probles uploading the MAC
        var force = options.force;
        delete options.force;

        auth(options.url);
    });

};
