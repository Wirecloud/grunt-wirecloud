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
Type: `Boolean` | `null`
Default value: `null`

Configure public visibility of the uploaded Mashable Application Component. If
this value is `true` the uploaded MAC will be configure to be available to all
the users. If `false` the MAC will be available only to the configured `users`
and `groups`.

If `null`, the server will chose the default value for this parameter. This
means that uploaded MACS will be public when uploading it into a wirecloud
catalogue instance and private when uploading into a WireCloud platform
instance.

This parameter may require permissions on the target server.


### Flags

Some options are also available as flags in case you want to change them when executing the grunt command. There are two flags available:
* **target**: used to choose the instance to which the component will be uploaded.
* **public**: used to make the component available to all users.

#### Example

To upload a widget available to all users to localhost instance using flags you can use the this Gruntfile.js configuration:

```js
grunt.initConfig({
    wirecloud: {
        default: {
            file: 'build/component.wgt'
        }
    },
});
```
And the following command:

```shell
grunt wirecloud --target localhost --public
```

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
            overwrite: true
        },
        publish: {
            file: 'path/to/component/file'
        }
    }
});
```

#### Upload a public component

This configuration uploads a component avilable to all users.

```js
grunt.initConfig({
    wirecloud: {
        options: {
            instance: 'some_instance',
            public: true
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
