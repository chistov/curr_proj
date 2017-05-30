<?php
  require_once dirname(__FILE__) . '/app/common/php/Users.php';
  $users = Users::instance();
  if ( $users->hasAuthUser() )
    header("Location: ./");

  require_once dirname(__FILE__) . '/app/common/php/Translate.php';
  $title = Translate::gettext('COMMON.TITLE_HTML');
?>

<!DOCTYPE html>
<!--[if lt IE 7]>      <html lang="en" ng-app="krozLogin" class="no-js lt-ie9 lt-ie8 lt-ie7"> <![endif]-->
<!--[if IE 7]>         <html lang="en" ng-app="krozLogin" class="no-js lt-ie9 lt-ie8"> <![endif]-->
<!--[if IE 8]>         <html lang="en" ng-app="krozLogin" class="no-js lt-ie9"> <![endif]-->
<!--[if gt IE 8]><!--> <html lang="en" ng-app="krozLogin" class="no-js"> <!--<![endif]-->

<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="КРОЗ панель управления">

  <link rel="shortcut icon" href="app/common/img/nt-favicon.ico" type="image/png">
  <title><?=$title?></title>

  <!-- CSS -->
  <link href="bower_components/bootstrap/dist/css/bootstrap.min.css" rel="stylesheet" type="text/css">
  <link href="bower_components/font-awesome/css/font-awesome.min.css" rel="stylesheet" type="text/css">
  <link href='bower_components/angular-loading-bar/build/loading-bar.min.css' rel='stylesheet' type='text/css'>
  <link href="app/common/css/bootstrap-no-rounded-corners.css" rel="stylesheet" type="text/css">

  <!-- HTML5 Shim and Respond.js IE8 support of HTML5 elements and media queries -->
  <!-- WARNING: Respond.js doesn't work if you view the page via file:// -->
  <!--[if lt IE 9]>
    <script src="lib/js/html5shiv.js"></script>
    <script src="lib/js/respond.min.js"></script>
  <![endif]-->

  <style type="text/css">

    [ng\:cloak], [ng-cloak], [data-ng-cloak], [x-ng-cloak], .ng-cloak, .x-ng-cloak {
      display: none !important;
    }
    .translate-cloak {
      display: none !important;
    }

    .tooltip.tooltip-form-error .tooltip-inner {
      background-color: #d9534f;
    }
    .tooltip.tooltip-form-error .tooltip-arrow {
      border-right-color: #d9534f;
    }

    .login {
      margin: 60px auto 0;
      padding: 15px;
      text-align: center;
    }

    .logo {
      padding: 50px;
    }

    .login .footer {
      color: #fff;
      padding: 30px 0;
    }

    .login .footer .copyright {
      padding: 0 15px;
    }

    .login .lang {
      border-bottom: 1px solid #7EC3EA;
      padding: 5px;
    }

    .login .lang a {
      color: #fff;
      margin: 0 5px;
    }

    .login .lang a.active {
      pointer-events: none;
      cursor: default;
      color: #C7EBFF;
    }

    .login .alert {
      padding: 5px;
      margin-bottom: 15px;
    }

    body {
      background-color: #4eb1ea;
    }

  </style>

</head>

<body class="login">
  <!--[if lt IE 7]>
    <p class="browsehappy">You are using an <strong>outdated</strong> browser. Please <a href="http://browsehappy.com/">upgrade your browser</a> to improve your experience.</p>
  <![endif]-->

  <div class="container" ng-controller="krozLoginController as loginCtrl" ng-cloak translate-cloak>
    <div class="logo">
      <img ng-src="app/common/img/{{l10nLangKey}}.KROZ_logo2_big.png">
    </div>
    <div class="row">
      <div class="col-md-4 col-md-offset-4">
        <form name="loginCtrl.formLogin" ng-submit="submitLogin()" novalidate>
          <fieldset>
            <div class="alert alert-danger" role="alert" ng-show="errorToLogin" translate>COMMON.LOGIN_FORW.LOGIN_ATTEMPT_ERR</div>
            <div class="form-group has-feedback" ng-class="{'has-error': loginCtrl.formLogin.$submitted && loginCtrl.formLogin.login.$error.required}">
              <input class="form-control" type="text" placeholder="{{'COMMON.LOGIN_FORW.INPUT_LOGIN_PLACEHOLDER' | translate}}" name="login"
                     ng-model="login"
                     uib-tooltip="{{'COMMON.LOGIN_FORW.INPUT_LOGIN_EMPTY_ERR' | translate}}"
                     tooltip-append-to-body="true"
                     tooltip-class="tooltip-form-error"
                     tooltip-placement="right"
                     tooltip-trigger="mouseenter"
                     tooltip-enable="loginCtrl.formLogin.$submitted && loginCtrl.formLogin.login.$error.required"
                     autofocus required>
              <span class="glyphicon glyphicon-warning-sign form-control-feedback" aria-hidden="true" ng-show="loginCtrl.formLogin.$submitted && loginCtrl.formLogin.login.$error.required"></span>
            </div>
            <div class="form-group has-feedback" ng-class="{'has-error': loginCtrl.formLogin.$submitted && loginCtrl.formLogin.password.$error.required}">
              <input class="form-control" type="password" placeholder="{{'COMMON.LOGIN_FORW.INPUT_PASSW_PLACEHOLDER' | translate}}" name="password"
                     ng-model="password"
                     uib-tooltip="{{'COMMON.LOGIN_FORW.INPUT_PASSW_EMPTY_ERR' | translate}}"
                     tooltip-append-to-body="true"
                     tooltip-class="tooltip-form-error"
                     tooltip-placement="right"
                     tooltip-trigger="mouseenter"
                     tooltip-enable="loginCtrl.formLogin.$submitted && loginCtrl.formLogin.password.$error.required"
                     required>
              <span class="glyphicon glyphicon-warning-sign form-control-feedback" aria-hidden="true" ng-show="loginCtrl.formLogin.$submitted && loginCtrl.formLogin.password.$error.required"></span>
            </div>
            <button type="submit" class="btn btn-success btn-block">
              <i class="fa fa-sign-in fa-fw"></i>
              <span translate>COMMON.LOGIN_FORW.BTN_LOGIN</span>
            </button>
          </fieldset>
        </form>

        <h6 class="footer">
          <p class="lang">
            <a href ng-class="{'active': l10nLangKey == 'en'}" ng-click="changeLanguage('en')">English</a>
            <a href ng-class="{'active': l10nLangKey == 'ru'}" ng-click="changeLanguage('ru')">Русский</a>
          </p>
          <p class="copyright">
            &copy;
            <span translate>COMMON.NT_LOGO_TITLE</span>
            <br>
            <span translate>COMMON.KROZ_LOGO_TITLE</span>
          </p>
        </h6>
      </div>
    </div>
  </div>

  <script src="bower_components/angular/angular.min.js"></script>
  <script src="bower_components/angular-sanitize/angular-sanitize.min.js"></script>
  <script src="bower_components/angular-cookies/angular-cookies.min.js"></script>
  <script src="bower_components/angular-translate/angular-translate.min.js"></script>
  <script src="bower_components/angular-translate-loader-partial/angular-translate-loader-partial.min.js"></script>
  <script src="bower_components/angular-translate-storage-cookie/angular-translate-storage-cookie.min.js"></script>
  <script src="bower_components/angular-bootstrap/ui-bootstrap-tpls.min.js"></script>
  <script src="bower_components/angular-loading-bar/build/loading-bar.min.js"></script>
  <script src="app/common/js/kroz-login.js"></script>
  <script src="app/common/js/services/kroz-authenticate.js"></script>

</body>

</html>

