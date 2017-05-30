angular.module('ddosCommonDirectives', [])

.directive('confirmClick', function() {
  return {
    restrict: "A",
    link: function(scope, element, attrs) {
      var msg = attrs.confirmClick || "Необходимо подтверждение действия";
      var clickAction = attrs.confirmedClick;
      element.bind('click',function (event) {
          if ( window.confirm(msg) ) {
              scope.$eval(clickAction);
          }
      });
    }
  };
})

.directive('convertToNumber', function() {
  return {
    require: 'ngModel',
    link: function(scope, element, attrs, ngModel) {
      ngModel.$parsers.push(function(val) {
        return parseInt(val, 10);
      });
      ngModel.$formatters.push(function(val) {
        return '' + val;
      });
    }
  };
})

;