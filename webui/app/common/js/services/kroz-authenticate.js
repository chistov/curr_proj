'use strict';

/**
* krozAuthenticate Module
*
* Description
*/
angular.module('krozAuthenticate', [])

.factory('krozAuth', ['$http', '$q', '$log', function($http, $q, $log) {
  var f = {};
  f.roles = undefined;

  f.getRoles = function(){
    return f.roles;
  }

  f.login = function(username, password) {
    return post(
      'login',
      'app/common/php/Authenticate.php',
      {
        action: 'login',
        login: username,
        password: password
      });
  };

  f.logout = function() {
    return post(
      'logout',
      'app/common/php/Authenticate.php',
      {
        action: 'logout'
      });
  };

  // touch authenticated user
  f.touchUser = function() {
    return get(
      'touchUser',
      'app/common/php/Authenticate.php?action=touchUser',
      {
        ignoreLoadingBar: true,
        loadingIntercept: false
      });
  }

  var post = function (name, href, object, cfg) {
    var deferred = $q.defer();
    $http.post(href, object).then(
      function(response) {
        $log.debug( '1.krozAuth:' + name, response.status );
        if ( !response.data.success )
          deferred.reject(response.data.messages);
        deferred.resolve(response.data.data);
      },
      function(response) {
        $log.error( '2.krozAuth:' + name, response.status );
        deferred.reject('CONN_ERR');
      }
    );
    return deferred.promise;
  };

  var get = function (name, href, cfg) {
    var deferred = $q.defer();
    $http.get(href, cfg).then(
      function(response) {
        $log.debug( '1.krozAuth:' + name, response.status );
        if ( !response.data.success )
          deferred.reject(response.data.messages);

        f.roles = response;
        deferred.resolve(response.data.data);
      },
      function(response) {
        $log.error( '2.krozAuth:' + name, response.status );
        deferred.reject('CONN_ERR');
      }
    );
    return deferred.promise;
  };

  return f;
}])

;
