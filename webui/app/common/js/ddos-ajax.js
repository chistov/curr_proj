/**
* ddosAjax Module
*
* Description
*/
angular.module('ddosAjax', [])

.directive('loading', [function(){
  return {
    restrict: 'E',
    scope: {
      // onRefresh: '&'
    },
    template:
      // '<a href style="margin-left: 5px;" ng-click="refresh()"><i class="fa fa-refresh"></i></a>' +
      '<div class="loading-overlay" style="display: none;">' +
        // '<div class="loading-indicator">' +
        // '  <div class="sk-three-bounce">' +
        // '    <div class="sk-child sk-bounce1"></div>' +
        // '    <div class="sk-child sk-bounce2"></div>' +
        // '    <div class="sk-child sk-bounce3"></div>' +
        // '  </div>' +
        // '</div>' +
      '</div>' +
      '',

    controller: function($scope, $element, $attrs) {
      // var loadingHref = $element.find('a'); // refresh a
      // var loadingIcon = $element.find('i.fa'); // icon
      var loadingOverlay = $element.find('div.loading-overlay'); // overlay

      // $scope.refresh = function() {
      //   $scope.onRefresh();
      // };

      $scope.$on('loadingToggle', function(event, started) {
        event.preventDefault();
        if (started) {
          // loadingIcon.addClass('fa-spin-fix');
          // loadingHref.addClass('refresh-not-active');
          loadingOverlay.show();
        } else {
          // loadingIcon.removeClass('fa-spin-fix');
          // loadingHref.removeClass('refresh-not-active');
          loadingOverlay.hide();
        }
      });
    }
  };
}])

.directive('navbarNotify', [function(){
  return {
    restrict: 'E',
    scope: {},
    templateUrl: 'templates/kroz-ajax/growl-notifications/navbar-icon.html',

    controller: function($scope, $element, $attrs, $transclude, $document, ajaxMessages) {
      $scope.popoverOpened = false;
      $scope.ajaxMessages = ajaxMessages;

      $scope.archiveMesagesCount = function() {
        return $scope.ajaxMessages.archiveMessages.length;
      };

      var closePopover = function(event) {
        if (event &&
            ($element[0].contains(event.target) ||
             $(event.target).is('button.close') || // alert close
             $(event.target).parent().is('button.close') // Chrome fired up on span
            ))
          return;

        if ($scope.popoverOpened) {
          $scope.togglePopover();
          $scope.$apply();
        }
      };

      $scope.closeAllMessages = function(model) {
        $scope.ajaxMessages.deleteAll();
      };

      $scope.closeArchiveMessage = function(message, index) {
        $scope.ajaxMessages.deleteArchiveMessage(message);
      };

      $scope.closeActiveMessage = function(message, index) {
        $scope.ajaxMessages.deleteActiveMessage(message);
      };

      $scope.togglePopover = function(event) {
        $scope.popoverOpened = !$scope.popoverOpened;
        if ($scope.popoverOpened)
          $document.bind('click', closePopover);
        else
          $document.unbind('click', closePopover);
      };

      if ($scope.popoverOpened)
        $document.bind('click', closePopover);

      $scope.$on('$destroy', function() {
        $document.unbind('click', closePopover);
      });
    }
  };
}])

.provider('ajax', function() {
  var _activeRequests = 0;

  this.httpInterceptor = [
    '$q', '$rootScope', 'ajax',
    function ($q, $rootScope, ajax) {
      function needIntercept(config) {
        return ('loadingIntercept' in config ? config.loadingIntercept : true);
      }

      function _request(config) {
        if ( !needIntercept(config) )
          return;

        // FIXME how about user timeout ?
        config.cancel = $q.defer();
        config.timeout = config.cancel.promise;
        if ( (_activeRequests++) === 0 ) // loading started
          $rootScope.$broadcast('loadingToggle', true);
      }
      function _response(config) {
        if ( !needIntercept(config))
          return;
        if ( (--_activeRequests) === 0 ) // loading finished
          $rootScope.$broadcast('loadingToggle', false);
      }
      function _responseMessage( response, rejection ) {
      }
      function _checkResponse( response ) {
        // TODO add server error messages

        // Api messages
        if (response !== undefined && response.data &&
            response.data.messages && response.data.messages.length > 0) {
          ajax.addApiMessages( response.data.messages );
        }

      }

      return {
        'requestError': function(config) {
          return config;
        },
        'request': function(config) {
          _request( config );
          return config;
        },
        'response': function (response) {
          _response( response.config );
          _checkResponse( response );
          return response;
        },
        'responseError': function (rejection) {
          _response( rejection.config );
          _checkResponse( rejection );
          return $q.reject(rejection);
        }
      };
    }
  ];
  this.$get = [
    'ajaxMessages',
    function(ajaxMessages) {
    function addApiMessages( messages ) {
      if (!messages || !messages.length)
        return;
      for (var i = 0; i < messages.length; ++i) {
        ajaxMessages.addMessage( messages[i] );
      }
    }

    return {
      addApiMessages: addApiMessages
    };
  }];
})

.service('ajaxMessages', ['$timeout', function($timeout){
  var _this = this;
  var config = {
    limitActiveMessages: 15,
    showActiveMessages: 1500,

    limitArchiveMessages: 50,
  };

  this.archiveMessages = [];
  this.activeMessages = [];
  var archiveMessage = function(message) {
    var index = _this.activeMessages.indexOf( message );

    if (index != -1) {
      _this.activeMessages.splice(index, 1);

      if ( _this.archiveMessages.length >= config.limitArchiveMessages )
        _this.archiveMessages.shift();
      _this.archiveMessages.push( message );
    }
  };

  var deleteMessage = function (messages, message, index) {
    if (index === undefined)
      index = messages.indexOf( message );

    if (index != -1)
      messages.splice(index, 1);
  };

  this.addMessage = function(message) {
    if ( this.activeMessages.length >= config.limitactiveMessages )
      this.activeMessages.shift();

    this.activeMessages.push( message );

    $timeout(function() {
      archiveMessage(message);
    }, config.showActiveMessages);
  };

  this.deleteActiveMessage = function(message, index) {
    deleteMessage(this.activeMessages, message, index);
  };

  this.deleteArchiveMessage = function(message, index) {
    deleteMessage(this.archiveMessages, message, index);
  };

  this.deleteAll = function() {
    this.archiveMessages.length = 0;
  };
}])

.run(['$templateCache', '$rootScope', '$http',
  function ($templateCache, $rootScope, $http) {
    $templateCache.put('templates/kroz-ajax/growl-notifications/navbar-icon.html',
      '<div class="navbar-text notification-container">' +
      '  <a href class="navbar-link" ng-click="togglePopover($event)" ng-class="{\'active\': popoverOpened}">' +
      '    <i class="fa fa-bell"></i>' +
      '    <span class="notification-counter" ng-if="archiveMesagesCount()">{{archiveMesagesCount()}}</span>' +
      '  </a>' +
      '  <div class="popover bottom" ng-show="popoverOpened">' +
      '    <div class="arrow"></div>' +
      '    <div class="popover-content" style="">'+
      '      <div class="notification-popover">' +
      '        <uib-tabset class="tabset">' +
      '          <uib-tab heading="{{\'COMMON.NOTIFICATIONS.TAB_MESSAGES\' | translate}}">' +
      '            <div ng-if="ajaxMessages.archiveMessages.length">' +
      '              <div class="buttons-addon pull-right">' +
      '                <a href ng-click="closeAllMessages(ajaxMessages.archiveMessages)" translate>COMMON.NOTIFICATIONS.BTN_CLOSE_ALL</a>' +
      '              </div>' +
      '              <div class="clearfix"></div>' +
      '              <div class="messages">' +
      '                <uib-alert ng-repeat="alert in ajaxMessages.archiveMessages | orderBy:\'-date\'" type="{{alert.type}}" close="closeArchiveMessage(alert, $index)" ng-init="detailsOpened">' +
      '                  <strong>{{alert.date | date: \'dd.MM HH:mm:ss\'}}</strong> <a href ng-click="detailsOpened = !detailsOpened" class="alert-link">{{alert.title}}</a>' +
      '                  <small ng-if="detailsOpened">{{alert.details}}</small>' +
      '                </uib-alert>'+
      '              </div>' +
      '            </div>' +
      '            <p class="text-center text-muted" ng-if="!ajaxMessages.archiveMessages.length" translate>COMMON.NOTIFICATIONS.LABEL_NO_DATA</p>' +
      '          </uib-tab>' +
      '        </uib-tabset>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '  <div class="sidebar">' +
      '     <uib-alert ng-repeat="alert in ajaxMessages.activeMessages | orderBy:\'-date\'" type="{{alert.type}}">' +
      '       <strong>{{alert.date | date: \'dd.MM HH:mm:ss\'}}</strong> {{alert.title}}' +
      '     </uib-alert>'+
      '  </div>' +
      '</div>' +
      '');



    // XXX: not needed, because 'loading overlay' blocks all view for now
    // $rootScope.$on('$stateChangeStart',
    // function(event, toState, toParams, fromState, fromParams){
    //   // cancel pending requests on state change
    //   angular.forEach($http.pendingRequests, function(request) {
    //      if (request.cancel && request.timeout) {
    //         request.cancel.resolve();
    //      }
    //   });
    // });
  }
])

;
