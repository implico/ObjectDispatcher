/**
  Object dispatcher

  https://github.com/implico/objectDispatcher

  @author bartosz.sak@gmail.com
  @license MIT

*/

'use strict';

(function(window, document) {

  function ObjectDispatcher(id, options) {
    var _this = this;
    var defaults = {
      dispatch: {
        //the dispatch is run on DOMContentLoaded - this will additionally cause to wait until all modules are defined
        domReady: true,
        //the initial dispatch run is wrapped in setTimeout(fn, queue) to force run at the end of the queue
        queue: false
      },
      //module check options
      isModule: {
        //pass a function to replace standard behavior
        fn: false,
        //prepended to tested selector
        prepend: '#module-',
        //appended to tested selector
        append: ''
      }
    }
    this.settings = deepExtend({}, defaults, options);

    if ((typeof id != 'string') || (id.length < 1)) {
      throw new OdException('app id must be a non-empty string');
    }
    this.id = id;
    this.modules = {};
    ObjectDispatcher.apps[id] = this;

    return this;
  }

  ObjectDispatcher.apps = {};

  //static function, returns app by id
  ObjectDispatcher.app = function(appId) {
    if (ObjectDispatcher.apps[appId] instanceof ObjectDispatcher) {
      return ObjectDispatcher.apps[appId];
    }
    else {
      throw new OdException('application ' + appId + 'not found');
    }
  }

  //returns module reference by slash-delimited path (and creates if not exists)
  ObjectDispatcher.prototype.getModuleRefByPath = function(path, create) {
    if (typeof path !== 'string') {
      throw new OdException('wrong module name/path, expected string, ' + typeof path + ' given');
    }
    var pathArr = path.split('/'),
        ref = this.modules,
        curKey;

    for (var i = 0; i < pathArr.length; i++) {
      curKey = pathArr[i];

      if (create && (i == (pathArr.length - 1))) {
        ref = { object: ref, key: curKey };
      }
      else if (typeof ref[curKey] === 'undefined') {
        if (create) {
          ref[curKey] = {};
          ref = ref[curKey];
        }
        else {
          return undefined;
        }
      }
      else {
        ref = ref[curKey];
      }
    }

    return ref;
  }

  //sets or gets a module
  ObjectDispatcher.prototype.module = function(moduleId, moduleBody) {
    if (typeof moduleId === 'undefined') {
      throw new OdException('undefined module id');
    }
    else if (typeof moduleBody === 'undefined') {
      var module = this.getModuleRefByPath(moduleId);
      if (typeof module !== 'undefined') {
        return module;
      }
      else {
        throw new OdException('module ' + moduleId + ' not found');
      }
    }
    else if (moduleBody && (typeof moduleBody === 'object')) {
      var module = this.getModuleRefByPath(moduleId, true);
      module.object[module.key] = moduleBody;
      return moduleBody;
    }
    else {
      throw new OdException('wrong module body type, expected object, ' + typeof moduleBody + ' given');
    }
  }

  //returns true if an element with id (string) or one of ids (Array) is found; pass force not to prepend and append anything to the selector
  ObjectDispatcher.prototype.isModule = function(id, force, useOriginal) {
    var replaceFn = this.settings.isModule.fn;
    if (!useOriginal && replaceFn) {
      if (typeof replaceFn !== 'function')
        throw new OdException('expected function, ' + typeof replaceFn + ' given');
      return replaceFn.call(this, id, force);
    }
    if (!force) {
      id = this.settings.isModule.prepend + id + this.settings.isModule.append;
    }

    var isCurrent = false;
    var ids = id instanceof Array ? id : [id];
    for (var i = 0; i < ids.length; i++) {
      if (document.querySelectorAll(ids[i]).length) {
        isCurrent = true;
        id = ids[i];
        break;
      }
    }
    return isCurrent ? id : false;
  }


  //starts dispatching

  //if __init property is set, to start dispatching:
  // - function: must return truthy value
  // - boolean: must be true
  // - string: this.isModule(__init) is checked
  //for top-level modules: if __init property is not set, return value of this.isModule(moduleId) is assumed
  //for submodules (lower-level): if __init property is not set, true is assumed
  //functions and objects with keys not starting with "_" are skipped in dispatching
  //if you provide a __once property with true value, the module will be initialized only once (e.g. for SPA layout code)
  ObjectDispatcher.prototype.dispatch = function(options) {
    var _this = this;

    var defaults = {
      data: undefined,
      moduleId: null,
      force: false,
      options: _this.settings
    }

    var options = options || {};

    var settings = deepExtend({}, defaults, options);

    //todo: force
    var dispatchFn = function() {
      if (settings.moduleId !== null) {
        //module id set
        _this.dispatchRun(_this.module(settings.moduleId), settings.data, settings.force, 1, settings.moduleId, settings.moduleId);
      }
      else {
        //all modules
        _this.dispatchRun(_this.modules, settings.data, settings.force, 0);
      }
    }

    var queue = settings.options.dispatch.queue,
        dispatchFnQueued = dispatchFn;
    //apply timeout
    if (queue !== false) {
      dispatchFnQueued = function() {
        setTimeout(dispatchFn, queue === true ? 0 : queue);
      }
    }

    if (settings.options.dispatch.domReady) {
      onDomReady(dispatchFnQueued);
    }
    else {
      dispatchFnQueued();
    }

    return this;
  }

  //performs dispatching
  //ObjectDispatcher.prototype.dispatchRun = function(useTimeout, data, obj, objKey, depth, moduleId) {
  ObjectDispatcher.prototype.dispatchRun = function(obj, data, force, depth, objKey, moduleId, module, parentModule) {
    var _this = this;

    if (!obj || (typeof obj !== 'object')) {
      throw new OdException('expected object, ' + typeof obj + ' given (moduleId: ' + moduleId + ', key: ' + objKey + ')');
    }
    else if   ((depth == 0)
            || (force)
            || ((depth == 1) && (typeof obj['__init'] === 'undefined') && this.isModule(objKey))
            || ((depth == 1) && ((typeof obj['__init'] === 'string') || (obj['__init'] instanceof Array)) && this.isModule(obj['__init']))
            || ((depth > 1) && (typeof obj['__init'] === 'undefined'))
            || ((typeof obj['__init'] === 'function') && obj['__init'](data))
            || ((typeof obj['__init'] !== 'function') && (obj['__init'] === true))) {

      if (depth == 1) {
        module = obj;
      }

      if ((typeof obj.__once !== 'undefined') && (typeof obj.__once !== 'number'))
        obj.__once = obj.__once ? 1 : 0;

      if ((depth == 0) || (force) || (typeof obj.__once === 'undefined') || (--obj.__once >= 0)) {
        if (obj.__once && (obj.__once < 0))
          obj.__once = 0;

        //set system refs
        if ((depth > 0) && !obj.__module) {
          obj.__od = _this;
          obj.__module = module || obj;
          obj.__modules = function(moduleId) {
            return _this.module(moduleId);
          }

          if (parentModule) {
            obj.__parent = parentModule;
          }
        }
        if (depth >= 1) {
          parentModule = obj;
        }

        for (var key in obj) {
          if (!obj.hasOwnProperty(key) || (key == '__init'))
            continue;
          //console.log(key, (key.charAt(0) === '_'), (key.charAt(1) !== '_'));
          if ((typeof key !== 'string') || ((depth == 0) || ((key.charAt(0) === '_') && (key.charAt(1) !== '_')))) {
            if (obj[key] && (typeof obj[key] === 'object')) {
              this.dispatchRun(obj[key], data, false, depth + 1, key, depth == 0 ? key : moduleId, module, parentModule);
            }
            else if (typeof obj[key] === 'function') {
              obj[key](obj);
            }
          }
        }
      }
    }
  }

  /*
   *  Utilities
   */

  //Exception object
  function OdException(message) {
    this.message = 'ObjectDispatcher: ' + message;
  }

  OdException.prototype = Object.create(Error.prototype);;
  OdException.prototype.constructor = OdException;


  //on DOM ready handler
  //source: https://plainjs.com/
  var onDomReady = function(callback) {
    // in case the document is already rendered
    if (document.readyState != 'loading') {
      callback();
    }
    // modern browsers
    else if (document.addEventListener) {
      document.addEventListener('DOMContentLoaded', callback);
    }
    // IE <= 8
    else {
      document.attachEvent('onreadystatechange', function(){
        if (document.readyState == 'complete')
          callback();
      });
    }
  }

  //$.extend in Vanilla JS
  //upgraded source: http://youmightnotneedjquery.com/
  var deepExtend = function(out) {
    out = out || {};

    for (var i = 1; i < arguments.length; i++) {
      var obj = arguments[i];

      if (!obj)
        continue;

      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (obj[key] && (typeof obj[key] === 'object'))
            out[key] = deepExtend(out[key], obj[key]);
          else
            out[key] = obj[key];
        }
      }
    }

    return out;
  }


  //make the "class" global
  window.ObjectDispatcher = ObjectDispatcher;

})(window, document);
