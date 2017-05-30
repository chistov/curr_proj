'use strict';

/**
* krozDirectives.mask Module
* from: https://github.com/assisrafael/angular-input-masks
*
* Description
*/

var krozStringMask = function(pattern, opt) {
  var tokens = {
    '0': {pattern: /\d/, _default: '0'},
    '9': {pattern: /\d/, optional: true},
    '#': {pattern: /\d/, optional: true, recursive: true},
    'S': {pattern: /[a-zA-Z]/},
    'U': {pattern: /[a-zA-Z]/, transform: function (c) { return c.toLocaleUpperCase(); }},
    'L': {pattern: /[a-zA-Z]/, transform: function (c) { return c.toLocaleLowerCase(); }},
    '$': {escape: true}
  };

  function isEscaped(pattern, pos) {
    var count = 0;
    var i = pos - 1;
    var token = {escape: true};
    while (i >= 0 && token && token.escape) {
      token = tokens[pattern.charAt(i)];
      count += token && token.escape ? 1 : 0;
      i--;
    }
    return count > 0 && count%2 === 1;
  }

  function calcOptionalNumbersToUse(pattern, value) {
    var numbersInP = pattern.replace(/[^0]/g,'').length;
    var numbersInV = value.replace(/[^\d]/g,'').length;
    return numbersInV - numbersInP;
  }

  function concatChar(text, character, options, token) {
    if (token && typeof token.transform === 'function') character = token.transform(character);
    if (options.reverse) return character + text;
    return text + character;
  }

  function hasMoreTokens(pattern, pos, inc) {
    var pc = pattern.charAt(pos);
    var token = tokens[pc];
    if (pc === '') return false;
    return token && !token.escape ? true : hasMoreTokens(pattern, pos + inc, inc);
  }

  function insertChar(text, char, position) {
    var t = text.split('');
    t.splice(position >= 0 ? position: 0, 0, char);
    return t.join('');
  }

  this.process = function proccess(value) {
    if (!value) return '';
    value = value + '';
    var pattern2 = this.pattern;
    var valid = true;
    var formatted = '';
    var valuePos = this.options.reverse ? value.length - 1 : 0;
    var optionalNumbersToUse = calcOptionalNumbersToUse(pattern2, value);
    var escapeNext = false;
    var recursive = [];
    var inRecursiveMode = false;

    var steps = {
      start: this.options.reverse ? pattern2.length - 1 : 0,
      end: this.options.reverse ? -1 : pattern2.length,
      inc: this.options.reverse ? -1 : 1
    };

    function continueCondition(options) {
      if (!inRecursiveMode && hasMoreTokens(pattern2, i, steps.inc)) {
        return true;
      } else if (!inRecursiveMode) {
        inRecursiveMode = recursive.length > 0;
      }

      if (inRecursiveMode) {
        var pc = recursive.shift();
        recursive.push(pc);
        if (options.reverse && valuePos >= 0) {
          i++;
          pattern2 = insertChar(pattern2, pc, i);
          return true;
        } else if (!options.reverse && valuePos < value.length) {
          pattern2 = insertChar(pattern2, pc, i);
          return true;
        }
      }
      return i < pattern2.length && i >= 0;
    }

    for (var i = steps.start; continueCondition(this.options); i = i + steps.inc) {
      var pc = pattern2.charAt(i);
      var vc = value.charAt(valuePos);
      var token = tokens[pc];
      if (!inRecursiveMode || vc) {
        if (this.options.reverse && isEscaped(pattern2, i)) {
          formatted = concatChar(formatted, pc, this.options, token);
          i = i + steps.inc;
          continue;
        } else if (!this.options.reverse && escapeNext) {
          formatted = concatChar(formatted, pc, this.options, token);
          escapeNext = false;
          continue;
        } else if (!this.options.reverse && token && token.escape) {
          escapeNext = true;
          continue;
        }
      }

      if (!inRecursiveMode && token && token.recursive) {
        recursive.push(pc);
      } else if (inRecursiveMode && !vc) {
        if (!token || !token.recursive) formatted = concatChar(formatted, pc, this.options, token);
        continue;
      } else if (recursive.length > 0 && token && !token.recursive) {
        // Recursive tokens most be the last tokens of the pattern
        valid = false;
        continue;
      } else if (!inRecursiveMode && recursive.length > 0 && !vc) {
        continue;
      }

      if (!token) {
        formatted = concatChar(formatted, pc, this.options, token);
        if (!inRecursiveMode && recursive.length) {
          recursive.push(pc);
        }
      } else if (token.optional) {
        if (token.pattern.test(vc) && optionalNumbersToUse) {
          formatted = concatChar(formatted, vc, this.options, token);
          valuePos = valuePos + steps.inc;
          optionalNumbersToUse--;
        } else if (recursive.length > 0 && vc) {
          valid = false;
          break;
        }
      } else if (token.pattern.test(vc)) {
        formatted = concatChar(formatted, vc, this.options, token);
        valuePos = valuePos + steps.inc;
      } else if (!vc && token._default && this.options.usedefaults) {
        formatted = concatChar(formatted, token._default, this.options, token);
      } else {
        valid = false;
        break;
      }
    }

    return {result: formatted, valid: valid};
  };

  this.apply = function(value) {
    return this.process(value).result;
  };

  this.validate = function(value) {
    return this.process(value).valid;
  };

  this.options = opt || {};
  this.options = {
    reverse: this.options.reverse || false,
    usedefaults: this.options.usedefaults || this.options.reverse
  };
  this.pattern = pattern;
};

krozStringMask.prototype.constructor = krozStringMask;

angular.module('krozDirectives.inputMask', [])

.factory('krozMaskPreFormatters', [function() {
  function clearDelimitersAndLeadingZeros(value) {
    if (value === '0') {
      return '0';
    }

    var cleanValue = value.replace(/^-/,'').replace(/^0*/, '');
    return cleanValue.replace(/[^0-9]/g, '');
  }

  function prepareNumberToFormatter(value, decimals) {
    return clearDelimitersAndLeadingZeros((parseFloat(value)).toFixed(decimals));
  }

  return {
    clearDelimitersAndLeadingZeros: clearDelimitersAndLeadingZeros,
    prepareNumberToFormatter: prepareNumberToFormatter
  };
}])
.factory('krozMaskNumberMasks', [function() {
  return {
    viewMask: function(decimals, decimalDelimiter, thousandsDelimiter) {
      var mask = '#' + thousandsDelimiter + '##0';

      if (decimals > 0) {
        mask += decimalDelimiter;
        for (var i = 0; i < decimals; i++) {
          mask += '0';
        }
      }

      return new krozStringMask(mask, {
        reverse: true
      });
    },
    modelMask: function(decimals) {
      var mask = '###0';

      if (decimals > 0) {
        mask += '.';
        for (var i = 0; i < decimals; i++) {
          mask += '0';
        }
      }

      return new krozStringMask(mask, {
        reverse: true
      });
    }
  };
}])
.factory('krzoMaskValidators', [function(){
  return {
    maxNumber: function(ctrl, value, limit) {
      var max = parseFloat(limit, 10);
      return ctrl.$isEmpty(value) || isNaN(max) || value <= max;
    },
    minNumber: function(ctrl, value, limit) {
      var min = parseFloat(limit, 10);
      return ctrl.$isEmpty(value) || isNaN(min) || value >= min;
    }
  };
}])

.directive('krozMaskNumber', ['$locale', '$parse', 'krozMaskPreFormatters', 'krozMaskNumberMasks', 'krzoMaskValidators',
  function($locale, $parse, krozMaskPreFormatters, krozMaskNumberMasks, krzoMaskValidators){
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, element, attrs, ctrl) {
      var decimalDelimiter = $locale.NUMBER_FORMATS.DECIMAL_SEP,
        thousandsDelimiter = '`'/*$locale.NUMBER_FORMATS.GROUP_SEP*/,
        decimals = $parse(attrs.krozMaskNumber)(scope);

      if (isNaN(decimals)) {
        decimals = 0;
      }

      var viewMask = krozMaskNumberMasks.viewMask(decimals, decimalDelimiter, thousandsDelimiter),
        modelMask = krozMaskNumberMasks.modelMask(decimals);

      function parser(value) {
        if (ctrl.$isEmpty(value)) {
          return null;
        }

        var valueToFormat = krozMaskPreFormatters.clearDelimitersAndLeadingZeros(value) || '0';
        var formatedValue = viewMask.apply(valueToFormat);
        var actualNumber = parseFloat(modelMask.apply(valueToFormat));

        // if (angular.isDefined(attrs.uiNegativeNumber)) {
        //   var isNegative = (value[0] === '-'),
        //     needsToInvertSign = (value.slice(-1) === '-');

        //   //only apply the minus sign if it is negative or(exclusive)
        //   //needs to be negative and the number is different from zero
        //   if (needsToInvertSign ^ isNegative && !!actualNumber) {
        //     actualNumber *= -1;
        //     formatedValue = '-' + formatedValue;
        //   }
        // }

        if (ctrl.$viewValue !== formatedValue) {
          ctrl.$setViewValue(formatedValue);
          ctrl.$render();
        }

        return actualNumber;
      }

      function formatter(value) {
        if (ctrl.$isEmpty(value)) {
          return value;
        }

        var prefix = ''; //(angular.isDefined(attrs.uiNegativeNumber) && value < 0) ? '-' : '';
        var valueToFormat = krozMaskPreFormatters.prepareNumberToFormatter(value, decimals);
        return prefix + viewMask.apply(valueToFormat);
      }

      ctrl.$formatters.push(formatter);
      ctrl.$parsers.push(parser);

      // if (attrs.uiNumberMask) {
      //   scope.$watch(attrs.uiNumberMask, function(_decimals) {
      //     decimals = isNaN(_decimals) ? 2 : _decimals;
      //     viewMask = krozMaskNumberMasks.viewMask(decimals, decimalDelimiter, thousandsDelimiter);
      //     modelMask = krozMaskNumberMasks.modelMask(decimals);

      //     parser(ctrl.$viewValue);
      //   });
      // }

      if (attrs.min) {
        var minVal;

        ctrl.$validators.min = function(modelValue) {
          return krzoMaskValidators.minNumber(ctrl, modelValue, minVal);
        };

        scope.$watch(attrs.min, function(value) {
          minVal = value;
          ctrl.$validate();
        });
      }

      if (attrs.max) {
        var maxVal;

        ctrl.$validators.max = function(modelValue) {
          return krzoMaskValidators.maxNumber(ctrl, modelValue, maxVal);
        };

        scope.$watch(attrs.max, function(value) {
          maxVal = value;
          ctrl.$validate();
        });
      }
    }
  };
}])

;