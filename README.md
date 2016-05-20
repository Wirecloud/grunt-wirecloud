# grunt-wirecloud

> WireCloud utilities for grunt.

## Getting Started
This plugin requires Grunt `~0.4.5`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-wirecloud --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-wirecloud');
```

## The "wirecloud" task

_Run this task with the `grunt wirecloud` command._

Task targets and options may be specified according to the grunt [Configuring tasks](http://gruntjs.com/configuring-tasks) guide.

### Options

#### options.instance
Type: `String`
Default value: `'fiwarelab'`

Name of the WireCloud instance where the components are going to be uploaded.

#### options.overwrite
Type: `Boolean`
Default value: `false`

If the same version of the Mashable Application Component is currently uploaded to the instance, delete it and upload it again.
>**NOTE**: If this option is set to false and the component already exists, nothing will be done.

#### options.public
Type: `Boolean`
Default value: `false`

Uploads the Mashable Application Component and makes it available to all users.

### Usage Examples

#### Default Options

In this example, the default options are used to upload 'build/component.wgt'. So the 'build/component.wgt' file will be uploaded to the 'fiwarelab' instance.

```js
grunt.initConfig({
    wirecloud: {
        default: {
            file: 'build/component.wgt'
        }
    },
});
```

#### Overwriting existing component

In this example, the options are set to upload a component that already exist in the platform overwriting it.

```js
grunt.initConfig({
    wirecloud: {
        options: {
            instance: 'some_instance',
            mac_name: 'my_component',
            mac_vendor: 'my_vendor',
            mac_version: '0.1.0',
            overwrite: true
        },
        publish: {
            file: 'path/to/component/file'
        }
    }
});
```

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
_(Nothing yet)_
