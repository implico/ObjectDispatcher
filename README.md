# ObjectDispatcher
Simple object module dispatcher. Performs a recursive loop over defined module(s) object properties.

## Example

"test: yes" will appear, the other not.

```js
//first, create the ObjectDisatcher instance
var OD = new ObjectDispatcher('app').dispatch();
OD.module('index', {
  //no __init function (notice double underscore) for top-level: checked if module with current moduleId exists
  //(by default: #module-[moduleId], in this case #module-index)
  //see the options for more info about prepending/appending to the selector

  test: function() {
    console.log('test: yes');
  },

  //starting with "_" - no automatic dispatch (must be invoked manually, e.g. in an __init function)
  _testNo: function() {
    console.log('test: no');
  },

  //submodule
  testSubIndex: {
    //manual check - if returns truthy value, becomes dispatched
    __init: function() {
      return OD.isModule('index');  //checks if an element that matches "#module-index" selector exists
    },
    testSubIndex1: function() {
      console.log('testSubIndex1: yes');
    }
  },

  //submodule
  testSub: {
    //no __init function for submodule - always dispatched

    variable: 1,

    testSub1: function() {
      console.log('testSub1: yes');
    },
    testSub2: function() {
      console.log('testSub2: yes');
    },
    testSub3: {
      //if __init function is defined, it must return a truthy value to perform dispatching
      __init: function() {
        this._testSub32();
      },
      testSub31: function() {
        console.log('testsub31: no');
      },
      _testSub32: function() {
        console.log('_testSub32: yes');
      }
    },
    testSub4: {
      __init: function() {
        return OD.isModule(['not-exists', 'not-exists-2']);
      },
      testSub41: function() {
        console.log('testsub41: no');
      }
    }
  },

  //submodule as a closure with "private" variables
  testMod: (function() {
    var variable = 1;

    return {
      testMod1: function() {
        console.log('testmod1: yes', variable++);
      },
      _testMod2: function() {
        console.log('testmod2: no');
      },
      testMod3: function() {
        console.log('testmod3: yes', variable);
      }
    }
  })(),

  //layout
  testLayout: {
    //guaranteed to be dispatched only once (useful e.g. for SPA layout common code)
    _times: 1,

    testLayout1: function() {
      console.log('testLayout1: yes (only once!)');
    }
  }  
});

//run dispatcher
OD.dispatch();

//access a specified method manually
OD.module('index').testSub.testSub3._testSub32();
```

Assuming HTML:

```html
<div id="module-index">
  ...
</div>
```

## Calling dispatch at the beginning

Dispatch can be called at the object creation. If you pass `true` as the first parameter, it will be internally wrapped in `setTimeout(0)` to run it at the end of the queue (when all modules are ready). This is useful when you keep module definitions in separate files, and do not know when all of them are already registered.

So, the first line of the example could look like this:

```js
var OD = new ObjectDispatcher('app').dispatch(true);
```

Of course, the "run dispatcher" line at the end of the example should be then removed.


## Options

Pass as a second argument to the constructor.

```js
//shows default options
var options = {
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
```

See more in the source comments.