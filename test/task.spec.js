'use strict';

var chai = require('chai');
var expect = chai.expect;
var chaiAsPromised = require('chai-as-promised');
var WirecloudTask = require('../tasks/wirecloud.js');
var sinon = require('sinon');

chai.use(chaiAsPromised);

describe('Wirecloud Task', function () {

    before(function () {
        WirecloudTask
    });

    beforeEach(function () {

    });

    it('should upload a new MAC', function () {

    });

    it('should overwrite an existing MAC', function () {

    });

    it('should not try to delete a MAC that is not uploaded', function () {

    });

    it('should catch an error when checking if the MAC exists', function () {

    });

    it('should catch an error when deleting a MAC', function () {

    });

    it('should catch an error when uploading a MAC with overwrite set to true', function () {

    });

    it('should catch an error when uploading a MAC with overwrite set to false', function () {

    });

});
