(function (window, angular) {
  "use strict";

  /**
   * @ngdoc overview
   * @name ngBinding
   * @description
   *
   * # ngBinding
   *
   *
   * The `ngBinding` provides the posibility to interconnect polymer element using directives.
   *
   *
   * This module use a $rootScope with two main variables  `__binding`  and  `__blackboard`
   *
   * `Blackboard` will be used to register the producer element of data.
   *
   * `Binding` will have all the information about the elements that produce and consume data.
   *  
   * <pre>
   * <my-element bind-polymer register-variable></my-element>
   * </pre>
   */
  angular.module("ngBinding", ["ng"]).
  /**
     * @ngdoc service
     * @name ngBinding.BindingFactory
     * @description
     * Use `BindingFactory` to create a new Binding object.
     */
  factory("BindingFactory", function () {


    var _isEmpty = function () {
      if (this == null) {
        return true;
      }
      if (this.length > 0) {
        return false;
      }
      if (this.length === 0) {
        return true;
      }

      // Otherwise, does it have any properties of its own?
      // that this doesn't handle
      // toString and valueOf enumeration bugs in IE < 9
      for (var key in this) {
        if (hasOwnProperty.call(this, key) && key.charAt(0) !== "_") {
          return false;
        }
      }

      return true;
    };
    var _toList = function () {
      var list = [];
      for (var key in this) {
        if (key.charAt(0) !== "_") {
          list.push(this[key]);
        }
      }
      return list;
    };
    var _getTypeOfAttr = function (element, attrToSearch) {
      for (var key in this) {
        if (key.charAt(0) !== "_" && this[key].element === element) {
          for (var attr in this[key].attrs) {
            if (attr === attrToSearch) {
              return this[key].attrs[attr].type;
            }
          }
        }
      }
    };
    var _searchBinding = function (from, fromAttr, list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].elementName === from && list[i].toAttr === fromAttr) {
          return i;
        }
      }
      return -1;
    };

    /**
       * @ngdoc
       * @name ngBinding.BindingFactory#BindingFactory
       * @methodOf ngBinding.BindingFactory
       * @description
       *
       * The constructor of the new Object. It provides two new elements into the object.
       *
       *
       * <pre>
       * BindingFactory: {
       *		inputs: {
       *			_isEmpty: function(),
       *			_toList: function(),
       *			_getTypeOfAttr: function(elementTarget, attrToGet),
       *			my-list_1: {
       *				attrs: {
       *					filter: "String",
       *					items:: "Object"
       *				},
       *				//Angular element that represent this component.
       *				element: Object,
       *				name: "my-list_1"
       *			}
       *		},
       *		outputs: {
       *			_isEmpty: function(),
       *			_toList: function(),
       *			_getTypeOfAttr: function(elementTarget, attrToGet),
       *			input-text_1: {
       *				attrs: {
       *					text: "String"
       *				},
       *				//Angular element that represent this component.
       *				element: Object,
       *				name: "input-text_1"
       *			}
       *		}
       *}
       * </pre>
       *	- **inputs**: is the list of the html elements with input attributes. This attributes consume data of someone type.
       *	- **outputs**: is the list of html elements with output attributes. This attributes consume data of someone type.
       * <br><br>
       *
       * Either provides three auxiliar function to make easier access and check information about the inputs.
       *	- `_isEmpty()`: return if the list (inputs or outputs) is empty.
       *	- `_toList()`: return an array with all the component. You can use it in ng-repeat
       *	- `_getTypeOfAttr(elementTarget, attrToGet)`: return the type of the attribute `attrToGet`. It needs the 
       * angular element `elementTarget` for look for the attribute in this component.
       * <br><br>
       *
       * The component are added in the correct structure when the HTML tag that reference this componente has the directives
       * `bind-polymer` and `register-variable`
       */

    var BindingFactory = function () {
      this.inputs = {
        _isEmpty: _isEmpty,
        _toList: _toList,
        _getTypeOfAttr: _getTypeOfAttr
      };
      this.outputs = {
        _isEmpty: _isEmpty,
        _toList: _toList,
        _getTypeOfAttr: _getTypeOfAttr

      };
    };

    BindingFactory.prototype._removeElement = function (element) {
      //FUTURE quiza mandar información a los nodos a los que estaba enlazado para realizar accion  
      var bindingList;
      //Delete element in inputs
      if (this.inputs[element]) {
        bindingList = this.inputs[element].consumeOf;
        while(bindingList.length > 0) {
          this._removeBindingInfo(element, bindingList[0].elementName, bindingList[0].myAttr, bindingList[0].toAttr);
        }
        delete this.inputs[element];
      }

      //Delete element in outputs
      if (this.outputs[element]) {
        bindingList = this.outputs[element].produceTo;
        while(bindingList.length > 0) {
          this._removeBindingInfo(element, bindingList[0].elementName, bindingList[0].myAttr, bindingList[0].toAttr);
        }
        delete this.outputs[element];
      }
    };
    BindingFactory.prototype._addBindingInfo = function (producer, producerAttr, consumer, consumerAttr, watcher) {
      var indexInputs  = _searchBinding(producer, producerAttr, this.inputs[consumer].consumeOf);
      var indexOutputs  = _searchBinding(consumer, consumerAttr, this.outputs[producer].produceTo);
      if (indexInputs > -1 || indexOutputs > -1) {
        throw "Error: trying connect a consumer and a producer that they are already connected";
      }
      this.inputs[consumer].consumeOf.push({
        elementName: producer,
        toAttr: producerAttr,
        myAttr: consumerAttr,
        watcher: watcher
      });
      this.outputs[producer].produceTo.push({
        elementName: consumer,
        toAttr: consumerAttr,
        myAttr: producerAttr
      });
    };
    BindingFactory.prototype._removeBindingInfo = function (element, connectedElement, elementAttr, connectedAttr) {
      var index, inputElement, bindingAttr, watcherIndex, deletedElement;
      if (this.inputs[element]) {
        index = _searchBinding(connectedElement, connectedAttr, this.inputs[element].consumeOf);
        deletedElement = this.inputs[element].consumeOf.splice(index, 1);

        // Remove watcher for input element
        inputElement = angular.element(document.querySelector("[pseudo-name=" + element + "]"));
        watcherIndex = inputElement.scope().$$watchers.indexOf(deletedElement[0].watcher);
        inputElement.scope().$$watchers.splice(watcherIndex, 1);

        index = _searchBinding(element, elementAttr, this.outputs[connectedElement].produceTo);
        this.outputs[connectedElement].produceTo.splice(index, 1);
      } else if (this.outputs[element]) {
        index = _searchBinding(element, elementAttr, this.inputs[connectedElement].consumeOf);
        deletedElement = this.inputs[connectedElement].consumeOf.splice(index, 1);

        inputElement = angular.element(document.querySelector("[pseudo-name=" + connectedElement + "]"));
        watcherIndex = inputElement.scope().$$watchers.indexOf(deletedElement[0].watcher);
        inputElement.scope().$$watchers.splice(watcherIndex, 1);
        
        index = _searchBinding(connectedElement, connectedAttr, this.outputs[element].produceTo);
        this.outputs[element].produceTo.splice(index, 1);
      }
    };
    return BindingFactory;
  }).
  /**
     * @ngdoc service
     * @name ngBinding.Blackboard
     * @description
     * Use `Blackboard` to create a new Blackboard object. We will use this object to register all 
     * the outputs with them binding variables.
     */
  factory("Blackboard", function () {

    /**
     * @ngdoc
     * @name ngBinding.Blackboard#Blackboard
     * @methodOf ngBinding.Blackboard
     * @description
     *
     * The constructor for of new Object Blackboard. It provides several prototype function for administrate the 
     * elements:
     *
     * 
     * 
     * <pre>
     *	Blackboard: {
     *		input-text_0: {
     *			text: {
     *				bindingAttr: "text_input_text_0",
     *				type: "String"
     *			},
     *			_proto: {
     *				_isEmpty: function(),
     *				_toList: function(),
     *				_getTypeOfBindingAttr: function(bindingName),
     *			}
     *		}
     * }
     * </pre>
     *	- `_isEmpty()`: return if there are not elements in the blackboard.
     * - `_toList()`: return an array with all the component. You can use it in ng-repeat.
     * - `_getTypeOfBindingAttr(bindingName)`: return the type of the binding variable. It need the name of the variable.
     *
     */
    var Blackboard = function () {};
    Blackboard.prototype._isEmpty = function () {
      // null and undefined are "empty"
      if (this == null) {
        return true;
      }
      // Assume if it has a length property with a non-zero value
      // that that property is correct.
      if (this.length > 0) {
        return false;
      }
      if (this.length === 0) {
        return true;
      }

      // Otherwise, does it have any properties of its own?
      // that this doesn't handle
      // toString and valueOf enumeration bugs in IE < 9
      for (var key in this) {
        if (hasOwnProperty.call(this, key) && key.charAt(0) !== "_") {
          return false;
        }
      }

      return true;
    };
    Blackboard.prototype._toList = function () {
      var list = [];
      for (var key in this) {
        if (key.charAt(0) !== "_") {
          list.push(this[key]);
        }
      }
      return list;
    };
    Blackboard.prototype._getTypeOfBindingAttr = function (bindingName) {
      var list = this._toList();

      for (var index in list) {
        for (var attr in list[index]) {
          if (attr.charAt(0) !== "_" && list[index][attr].bindingAttr === bindingName) {
            return list[index][attr].type
          }
        }
      }
    };
    Blackboard.prototype._removeElement = function (element) {
      var elementDelete = this[element];
      delete this[element];

      return elementDelete;

    };
    Blackboard.prototype._getElementByBindingAttr = function (bindingAttr) {
      var list = this._toList();

      for (var index in list) {
        for (var attr in list[index]) {
          if (attr.charAt(0) !== "_" && list[index][attr].bindingAttr === bindingAttr) {
            return list[index];
          }
        }
      }
    };
    return Blackboard;
  }).

  run(function ($rootScope, BindingFactory, Blackboard) {
    $rootScope.__binding = new BindingFactory();
    $rootScope.__blackboard = new Blackboard();
  }).

  directive("bindPolymer", ["$parse", function ($parse) {
    return {
      restrict: 'A',
      scope: false,
      compile: function bindPolymerCompile(el, attr) {
        var attrMap = {};

        for (var prop in attr) {
          if (angular.isString(attr[prop])) {
            var _match = attr[prop].match(/\{\{\s*([\.\w]+)\s*\}\}/);
            if (_match) {
              attrMap[prop] = $parse(_match[1]);
            }
          }
        }
        return function bindPolymerLink(scope, element, attrs) {

          // When Polymer sees a change to the bound variable,
          // $apply / $digest the changes here in Angular
          var observer = new MutationObserver(function polymerMutationObserver(mutations) {
            scope.$apply(function processMutationsHandler() {
              mutations.forEach(function processMutation(mutation) {

                var attributeName, newValue, oldValue, getter;
                attributeName = mutation.attributeName;

                if (attributeName in attrMap) {
                  newValue = element.attr(attributeName);
                  getter = attrMap[attributeName];
                  oldValue = getter(scope);

                  if (oldValue != newValue && angular.isFunction(getter.assign)) {
                    getter.assign(scope, newValue);
                  }
                }
              });
            });
          });

          observer.observe(element[0], {
            attributes: true
          });
          scope.$on("$destroy", observer.disconnect.bind(observer));
        }
      }
    };
  }]).

  directive("registerVariable", ["$rootScope", "$compile", function ($rootScope, $compile) {

    // TODO filtros para los elementos elegibles (¿delegar en el usuario?)
    function link(scope, element) {
      var isEmpty = function (obj) {

        if (obj == null) {
          return true;
        }
        if (obj.length > 0) {
          return false;
        }
        if (obj.length === 0) {
          return true;
        }

        // Otherwise, does it have any properties of its own?
        // that this doesn't handle
        // toString and valueOf enumeration bugs in IE < 9
        for (var key in obj) {
          if (hasOwnProperty.call(obj, key)) {
            return false;
          }
        }

        return true;

      };
      var getMe = function (sought) {
        var list = document.getElementsByTagName(sought.tagName);
        for (var index in list) {
          if (list[index] === sought) {
            return index;
          }
        }
      };
      //TODO realizar comprobación de bucles
      //TODO comprobación de tipos compleja mediante una abstración superior (XML?)
      scope.__addAttribute = function (objetive, attribute, bindingAttrName) {
        //TODO Comprobar existencia de ambas partes en las estructuras binding y blackboard
        //Check type of element
        var inputType = scope.__binding.inputs._getTypeOfAttr(objetive, attribute);
        var outputType = scope.__blackboard._getTypeOfBindingAttr(bindingAttrName);
        if (inputType !== outputType) {
          throw "Input and output type are not equals: " + inputType + " vs " + outputType;
        }
        // Add information to __binding variable
        var producer = scope.__blackboard._getElementByBindingAttr(bindingAttrName).name;
        var consumer = objetive.attr("pseudo-name");
        

        var interpolationName = "{{" + bindingAttrName + "}}";
        objetive.attr(attribute, interpolationName);
        var injector = objetive.injector();
        var $compile = injector.get("$compile");
        $compile(objetive)(objetive.scope());
        // NOTE we used the first watcher of the scope, we take over that it is the watcher of the binding
        var watcher = objetive.scope().$$watchers[0];
        scope.__binding._addBindingInfo(producer, attribute, consumer, bindingAttrName.split("_")[0], watcher);
      
      };
      scope.__disconnectAttributes = function(element, elementAttr, connect, connectAttr) {
          $rootScope.__binding._removeBindingInfo(element, connect, elementAttr, connectAttr);
          var inputElement = angular.element(document.querySelector("[pseudo-name=" + connect + "]"));
      }
      scope.__removeElement = function(element) {
        if (typeof(element) == "object") {
          scope.$apply(function(){
            angular.element(element).remove();
          });
        } else {
          scope.$apply(function(){
            angular.element(document.querySelector("[pseudo-name=" + element + "]")).remove();
          });
        }
      };

      var removeElement = function () {
        //Call remove of scope.__binding.remove(element)
        scope.__binding._removeElement(this.getAttribute("pseudo-name"));
        //Call remove of scope.__blackboard.remove(element)
        scope.__blackboard._removeElement(this.getAttribute("pseudo-name"));
      }
      var polymerElement = element[0];
      /* 1) guardamos todos los datos en una variable, tanto inputs como outputs*/

      /* Nombramos al elemento por los atributos*/
      var elementNameRegister = polymerElement.tagName.toLowerCase();
      // Contabilizar las veces que esta este elemento en inputs y outputs
      var nElement = getMe(polymerElement);
      elementNameRegister += "_" + nElement;

      /* Guardamos los inputs y los outputs */
      if (polymerElement.properties.inputs && !isEmpty(polymerElement.properties.inputs.value)) {
        $rootScope.__binding.inputs[elementNameRegister] = {
          attrs: polymerElement.properties.inputs.value,
          element: element,
          name: elementNameRegister,
          _toListAttrs: function () {
            var list = [];
            for (var key in this.attrs) {
              if (key.charAt(0) !== "_") {
                var element = this.attrs[key]
                element.name = key;
                list.push(element);
              }
            }
            return list;
          },
          consumeOf: []
        };
      }
      if (polymerElement.properties.outputs && !isEmpty(polymerElement.properties.outputs.value)) {
        $rootScope.__binding.outputs[elementNameRegister] = {
          attrs: polymerElement.properties.outputs.value,
          element: element[0],
          name: elementNameRegister,
          _toListAttrs: function () {
            var list = [];
            for (var key in this.attrs) {
              if (key.charAt(0) !== "_") {
                var element = this.attrs[key]
                element.name = key;
                list.push(element);
              }
            }
            return list;
          },
          produceTo: []
        };
      }

      /*2) modelo para intentar la idea de blackboard */

      /* Fase 1: registrar las variables en la blackboard para saber quien esta produciendo datos y por donde */
      var outputs = polymerElement.properties.outputs.value;

      if (!isEmpty(outputs)) {
        $rootScope.__blackboard[elementNameRegister] = {
          element: element[0],
          name: elementNameRegister
        };
        for (var output in outputs) {
          // We use the name of element register for identify the output.
          // We'll replace - by _ because angular deal with it like minus symbol.
          var bindingAttr = output + "_" + elementNameRegister.replace(/-/g, "_");
          $rootScope.__blackboard[elementNameRegister][output] = outputs[output];
          $rootScope.__blackboard[elementNameRegister][output].bindingAttr = bindingAttr;
        }

      }

      /* Fase 2: Añadir atributos al componente para que empiece a emitir información por esa variable */
      for (var attr in outputs) {
        var bindingAttr = $rootScope.__blackboard[elementNameRegister][attr].bindingAttr;
        $rootScope.bindingAttr = "";
        element.attr(attr, "{{" + bindingAttr + "}}");
      }

      /* Fase 3: recompilamos el componente con los binding de angularjs*/
      element.attr("pseudo-name", elementNameRegister);
      element.attr("bind-polymer", "");
      element.on("$destroy", removeElement);
      element.removeAttr("register-variable");
      $compile(element)(scope);
    }
    return {
      link: link
    };
  }]);
})(window, window.angular);