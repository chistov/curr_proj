'use strict';

var ddosView = angular.module('ddosView', [
  // libs
  'ngSanitize',
  'ngCookies',
  'ui.router',
  'ui.bootstrap',
  'ui.utils',
  'smart-table',
  'ui.select',
  'agGrid',
  'pascalprecht.translate',
  'ui.ace',
  'angular-loading-bar',

  // common
  'filters.formatSize',
  'ddosCommonDirectives',
  'krozDirectives.inputMask',
  'ddosDirectives.chart',
  'ddosDirectives.Diag',
  'ddosAttacksFilter',
  'ddosAjax',
  'ddosAgTree',
  'krozAuthenticate',

  // views
  'ddosState',
  'ddosNetwork',
  'ddosObjects',
  'ddosAttacks',
  'krozTraffic.TrafficManager',
  'krozTraffic.UrlBlocker',
  'krozTraffic.Capture',
  'ddosSettings',
  'krozSettingsBgp',
  'krozSettingsSmtp'
]);

ddosView

.config([
  '$logProvider', '$stateProvider', '$urlRouterProvider', '$httpProvider', '$translateProvider', '$translatePartialLoaderProvider', 'cfpLoadingBarProvider', 'ajaxProvider',
  function($logProvider, $stateProvider, $urlRouterProvider, $httpProvider, $translateProvider, $translatePartialLoaderProvider, cfpLoadingBarProvider, ajaxProvider) {

    $stateProvider
      .state('traffic', {
        url: '/traffic',
        abstract: true,
        template: '<div ui-view></div>',
      });

    if (!G_DDOS_ENABLED)
      $urlRouterProvider.otherwise('/network/analyzer/traffic');
    else
      $urlRouterProvider.otherwise('/state');

    $translatePartialLoaderProvider.addPart('common');
    $translateProvider
      .registerAvailableLanguageKeys(['en', 'ru'])
      .preferredLanguage('en')
      .useLoader('$translatePartialLoader', {
        urlTemplate: 'app/{part}/l10n/{lang}.json'
      })

      .useSanitizeValueStrategy('escape')
      .useCookieStorage();

    $logProvider.debugEnabled(true);
    cfpLoadingBarProvider.includeSpinner = false;
    $httpProvider.interceptors.push(ajaxProvider.httpInterceptor);
  }
])

.run(function ($rootScope, $log, $location, $translateCookieStorage, $state) {
  $rootScope.$log = $log;
  $rootScope.production = true;
  $rootScope.l10nLangKey = $translateCookieStorage.get('NG_TRANSLATE_LANG_KEY') || 'en';
  $rootScope.stateChange = function(state, params) {
    $state.go(state, params);
  };
})

.controller('krozNavController', [
  '$scope', '$rootScope', '$window', '$timeout', '$translate', '$translateCookieStorage', 'krozAuth', 'attacksFilter', 'ddosSettingsUserEditFactory',
  function($scope, $rootScope, $window, $timeout, $translate, $translateCookieStorage, krozAuth, attacksFilter, ddosSettingsUserEditFactory) {

  $scope.currentLanguageKey = $scope.l10nLangKey;
  $scope.changeLanguage = function (langKey) {
    if ( langKey == $scope.currentLanguageKey )
      return;
    $translateCookieStorage.set('NG_TRANSLATE_LANG_KEY', langKey);
    $window.location.reload();
  };

  $rootScope.authUser = undefined;

  $scope.logout = function() {
    krozAuth.logout().then(
      function(data) {
        $window.location.href = $window.location.href.replace('#', 'login.php#');
      },
      function(error) {});
  };

  $scope.editAuthUser = function() {
    if ( angular.isUndefined($rootScope.authUser) )
      return;

    ddosSettingsUserEditFactory.editUser($rootScope.authUser).then(
    function (userToSave) {
      angular.copy(userToSave, $rootScope.authUser);
    }, function () {
      $scope.$log.info('Modal edit dismissed at: ' + new Date());
    });
  };

  $scope.touchUser = function() {
    krozAuth.touchUser().then(
      function(data) {
        $rootScope.authUser = data;
        $rootScope.authUser.isAministrator = function() {
          return this.params.roles === 'admin';
        };
        attacksFilter.setClearObjectsId($rootScope.authUser.params.objects);
        $timeout($scope.touchUser, 60000, false);
      },
      function(errorMsg) {
        if ( errorMsg != 'CONN_ERR' ) {
          $scope.logout();
          return;
        }
        $timeout($scope.touchUser, 60000, false);
      });
  };
  
  $scope.access = true;
  $scope.$on('accessUpdate', function(e, userUpdate) {
    $scope.access = userUpdate;
  });

  $scope.touchUser();
}])

.directive('restrict', function( $interval, krozAuth){
	return{
		restrict: 'A',
		link: function(scope, element, attrs){
			var promise = $interval(initAccess, 100);
			var accessDenied = true;

			function initAccess() {
				if(krozAuth.roles != undefined){
          var attributes = attrs.access.split(' ');
					var userRoles = krozAuth.getRoles().data.data.roles.split(' ');
					userRoles.map(function(userRole){
					  attributes.map(function(pageRole){
					    if(userRole == pageRole)
						  accessDenied = false;  
					  });
          });
					
					if(accessDenied)
						scope.$emit('accessUpdate',false);
					$interval.cancel(promise);
				}
      }
		}
  }
})
;
