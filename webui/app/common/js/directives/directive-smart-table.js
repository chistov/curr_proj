angular.module('smart-table')

.run(['$templateCache', function ($templateCache) {
  $templateCache.put('template/smart-table/pagination-custom.html',
    '<nav ng-if="pages.length >= 2"><ul class="pagination pagination-sm" style="margin: 0;">' +
    '<li ng-class=\"{disabled: currentPage === 1}\"><a href ng-click=\"selectPage(1)\">&laquo;</a></li>' +
    '<li ng-class=\"{disabled: currentPage === 1}\"><a href ng-click=\"selectPage(currentPage - 1)\">&lsaquo;</a></li>' +
    '<li ng-repeat="page in pages" ng-class="{active: page==currentPage}"><a href ng-click="selectPage(page)">{{page}}</a></li>' +
    '<li ng-class=\"{disabled: currentPage === numPages}\"><a href ng-click=\"selectPage(currentPage + 1)\">&rsaquo;</a></li>' +
    '<li ng-class=\"{disabled: currentPage === numPages}\"><a href ng-click=\"selectPage(numPages)\">&raquo;</a></li>' +
    '</ul></nav>');
}])

.directive('stSearchReset', function() {
  return {
    require: '^stTable',
    restrict: 'EA',
    link: function (scope, element, attr, ctrl) {
      return element.bind('click', function() {
        return scope.$apply(function() {
          var tableState = ctrl.tableState();
          tableState.search.predicateObject = {};
          tableState.pagination.start = 0;
          return ctrl.pipe();
        });
      });
    }
  };
})

;