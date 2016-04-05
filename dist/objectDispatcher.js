/**
  Object dispatcher

  https://github.com/implico/objectDispatcher

  @author bartosz.sak@gmail.com
  @license MIT

*/
(function(window, document) {

  function ObjectDispatcher(id, options) {
    var _this = this;
    var defaults = {
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
      throw new OdException('module id must be a non-empty string');
    }
    this.id = id;
    this.modules = {};
    ObjectDispatcher.apps[id] = this;
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

  //sets or gets a module
  ObjectDispatcher.prototype.module = function(moduleId, moduleBody) {
    if (typeof moduleId === 'undefined') {
      throw new OdException('undefined module id');
    }
    else if (typeof moduleBody === 'undefined') {
      if (this.modules[moduleId]) {
        return this.modules[moduleId];
      }
      else {
        throw new OdException('module ' + moduleId + ' not found');
      }
    }
    else if (moduleBody && (typeof moduleBody === 'object')) {
      this.modules[moduleId] = moduleBody;
      return moduleBody;
    }
    else {
      throw new OdException('wrong module body type, expected object, ' + typeof moduleBody + ' given');
    }
  }

  //returns true if an element with id (string) or one of ids (Array) is found; pass force not to prepend and append anything to the selector
  ObjectDispatcher.prototype.isModule = function(id, force) {
    var replaceFn = this.settings.isModule.fn;
    if (replaceFn) {
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

  //performs dispatching
  //if _init function is set, must return truthy value to start dispatching
  //for top-level modules: if _init function is not set, return value of this.isModule(moduleId) is assumed
  //for submodules (lower-level): if _init function is not set, true is assumed
  //functions and objects with keys starting with "_" are skipped in dispatching
  //if you provide a _times property with a number value of X, the module will be initialized max. X times (e.g. for SPA layout code)
  ObjectDispatcher.prototype.dispatch = function(obj, objKey, depth, moduleId) {
    if (typeof obj === 'undefined') {
      this.dispatch(this.modules, null, 0);
    }
    else if (!obj || (typeof obj !== 'object')) {
      throw new OdException('expected object, ' + typeof obj + ' given (moduleId: ' + moduleId + ', key: ' + objKey + ')');
    }
    else if   ((depth == 0)
            || ((depth == 1) && (typeof obj['_init'] === 'undefined') && this.isModule(objKey))
            || ((depth > 1) && (typeof obj['_init'] === 'undefined'))
            || ((typeof obj['_init'] === 'function') && obj['_init']())
            || ((typeof obj['_init'] !== 'function') && obj['_init'])) {

      if ((depth == 0) || (typeof obj._times === 'undefined') || ((typeof obj._times === 'number') && (--obj._times >= 0))) {
        if (obj._times < 0)
          obj._times = 0;
        for (var key in obj) {
          if (!obj.hasOwnProperty(key) || (key == '_init'))
            continue;
          if ((typeof key !== 'string') || (key.charAt(0) != '_')) {
            if (obj[key] && (typeof obj[key] === 'object')) {
              this.dispatch(obj[key], key, depth + 1, depth == 0 ? key : moduleId);
            }
            else if (typeof obj[key] === 'function') {
              obj[key]();
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


  //$.extend in Vanilla JS
  //source: http://youmightnotneedjquery.com/
  var deepExtend = function(out) {
    out = out || {};

    for (var i = 1; i < arguments.length; i++) {
      var obj = arguments[i];

      if (!obj)
        continue;

      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (typeof obj[key] === 'object')
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
