context-config-node
===================

* **ConfigurationBuilder** allows reading/writing configs using local or remote storage. Single API is used in both cases which makes it easier to work with the class. This is the only class users should be using directly to utilize all functionality provided by the module. ConfigurationBuilder uses the following classes underneath:
  * **ContextConfiguration** is an advanced configuration lookup utility. The main feature is to look for best match of the same keywords, given a list of additional contexts. Compared with config.get(key), it provides config.get(key, contexts, default).
	* **ForwardConfiguration** is a proxy which stores an array of ContextConfigurations and forwards `get(key)` requests to elements of that array. It allows notifying users about changes in configs using 'change' event on EventEmitter.
	* **NodeConfig** is used to work with configs stored in local file system. It is a wrapper of [node-config](https://github.com/lorenwest/node-config) library


## API
| Function | Description |
|---|---|
|**ConfigurationBuilder**|
|`require('context-config').ConfigurationBuilder`|importing the constructor|
|`new ConfigurationBuilder(emitter)`|constructor accepts an EventEmitter and will emit 'config-read' event when new config is read|
|`build(context, ref)`| `ref` object lists properties of the app whose configs we want to load (can contain properties domain, target, project, config, and version). Returns a promise.



## Usage
### ConfigurationBuilder
create a new instance of ConfigurationBuilder
```
var ConfigurationBuilder = require('context-config').ConfigurationBuilder;
var builder = new ConfigurationBuilder(emitter);
```
call build method to load the config which in turn returns a promise.
```
builder.build(context, ref)
.then(function(config){
	// use the config
	console.log(config.get('key'));
})
.fail(function(error){
	// handle the error
	console.log(error.stack);
})
.done();
```
### ContextConfiguration
create a new instance of ContextConfiguration
```
var ContextConfiguration = require('context-config').ContextConfiguration;
var config = new ContextConfiguration([],[]);
```
append new values to the config
```
// without context
config.append({
	"key":"k1",
	"value":"v1"
});
// with context
config.append({
    "key":"k1",
    "context": {"site":"en-US"},
    "value":"v2"
});
```
get values using a key
```
// without a context
config.get("k1");	// should return "v1"
// with a context
config.get("k1", [{"site":"en-US"}]);	// should return "v2"
```
