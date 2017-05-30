'use strict';

var krozLogin = angular.module('krozLogin', [
  // libs
  'ngSanitize',
  'ngCookies',
  'pascalprecht.translate',
  'ui.bootstrap',
  'angular-loading-bar',

  // common
  'krozAuthenticate'
]);

krozLogin

.config([
  '$translateProvider', '$translatePartialLoaderProvider', 'cfpLoadingBarProvider',
  function($translateProvider, $translatePartialLoaderProvider, cfpLoadingBarProvider) {

    $translatePartialLoaderProvider.addPart('common');
    $translateProvider
      .registerAvailableLanguageKeys(['en', 'ru'])
      .preferredLanguage('en')
      .useLoader('$translatePartialLoader', {
        urlTemplate: 'app/{part}/l10n/{lang}.json'
      })

      .useSanitizeValueStrategy('escape')
      .useCookieStorage();

    cfpLoadingBarProvider.includeSpinner = false;
  }
])

.run(function ($rootScope, $log, $location, $translateCookieStorage) {
  $rootScope.$log = $log;
  $rootScope.l10nLangKey = $translateCookieStorage.get('NG_TRANSLATE_LANG_KEY') || 'en';
})

.controller('krozLoginController', [
  '$scope', '$window', '$http', '$translateCookieStorage', 'krozAuth',
  function($scope, $window, $http, $translateCookieStorage, krozAuth){

  var _this = this;
  $scope.login = '';
  $scope.password = '';
  $scope.errorToLogin = false;

  $scope.changeLanguage = function(key) {
    $translateCookieStorage.set('NG_TRANSLATE_LANG_KEY', key);
    $window.location.reload();
  };

  $scope.submitLogin = function() {
    if (_this.formLogin.$invalid)
      return;

    krozAuth.login($scope.login, $scope.password)
      .then(
        function(data) {
          $scope.errorToLogin = false;
          $window.location.href = $window.location.href.replace('login.php', '');
        },
        function(error) {
          $scope.errorToLogin = true;
        }
      );
  };

}])

;
