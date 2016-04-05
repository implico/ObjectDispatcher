# objectDispatcher
Simple object module dispatcher. Performs a recursive loop over the object properties.

## Example

"test: yes" will appear, the other not.

```js
var OD = new ObjectDispatcher('app');
OD.module('index', {
  //no _init function for top-level: checked if module with current moduleId exists
  //(by default: #module-[moduleId], in this case #module-index)
  //see the options for more info about prepending/appending to the selector

  test: function() {
    console.log('test: yes');
  },

  //starting with "_" - no automatic dispatch (must be invoked manually, e.g. in an _init function)
  _testNo: function() {
    console.log('test: no');
  },

  //submodule
  testSubIndex: {
    //manual check - if returns truthy value, becomes dispatched
    _init: function() {
      return OD.isModule('index');  //checks if an element that matches "#module-index" selector exists
    },
    testSubIndex1: function() {
      console.log('testSubIndex1: yes');
    }
  },

  //submodule
  testSub: {
    //no _init for submodule: always dispatched

    variable: 1,

    testSub1: function() {
      console.log('testSub1: yes');
    },
    testSub2: function() {
      console.log('testSub2: yes');
    },
    testSub3: {
      //if _init function is defined, it must return a truthy value to perform dispatching
      _init: function() {
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
      _init: function() {
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

## Options

Pass as a second argument to the constructor.

```js
//shows default options
var options = {
  //module check options
  isModule: {
    //pass a function to replace standard behavior
    body: false,
    //prepended to tested selector
    prepend: '#module-',
    //appended to tested selector
    append: ''
  }
}
```

See more in the source comments.