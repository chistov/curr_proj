<?php
  require_once dirname(__FILE__) . '/app/common/php/Users.php';
  require_once dirname(__FILE__) . '/app/common/php/Settings.php';
  require_once dirname(__FILE__) . '/app/common/php/Translate.php';

  $l10nLangKey = Translate::langKey();
  $users = Users::instance();
  if ( !$users->hasAuthUser() )
    header("Location: ./login.php");

  $settings = Settings::instance();
  $title = Translate::gettext('COMMON.TITLE_HTML');
  $nav = 'app/common/html';
  if ( $settings->ANALYZER_DDOS_ENABLED ) {
    // $title = 'КРОЗ - блокирование DDOS | Norsi-Trans';
    $nav .= "/nav-ddos.html";
  } else {
    // $title = 'КРОЗ | Norsi-Trans';
    $nav .= "/nav-analyzer.html";
  }
?>

<!DOCTYPE html>
<!--[if lt IE 7]>      <html lang="en" ng-app="ddosView" class="no-js lt-ie9 lt-ie8 lt-ie7"> <![endif]-->
<!--[if IE 7]>         <html lang="en" ng-app="ddosView" class="no-js lt-ie9 lt-ie8"> <![endif]-->
<!--[if IE 8]>         <html lang="en" ng-app="ddosView" class="no-js lt-ie9"> <![endif]-->
<!--[if gt IE 8]><!--> <html lang="en" ng-app="ddosView" class="no-js"> <!--<![endif]-->

<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="KROZ | NORSI-TRANS">

  <link rel="shortcut icon" href="app/common/img/nt-favicon.ico" type="image/png">
  <title><?=$title?></title>

  <!-- bower_components CSS -->
  <!-- <link href="bower_components/bootstrap/dist/css/bootstrap.css" rel="stylesheet" type="text/css"> -->
  <link href="bower_components/bootstrap/dist/css/bootstrap.min.css" rel="stylesheet" type="text/css">

  <link href="bower_components/font-awesome/css/font-awesome.min.css" rel="stylesheet" type="text/css">
  <!-- <link href="bower_components/font-awesome/css/font-awesome.css" rel="stylesheet" type="text/css"> -->

  <link href="bower_components/SpinKit/css/spinkit.css" rel="stylesheet" type="text/css">

  <link href="bower_components/ui-select/dist/select.min.css" rel="stylesheet" type="text/css">
  <!-- <link href="bower_components/ui-select/dist/select.css" rel="stylesheet" type="text/css"> -->

  <link href="bower_components/ag-grid/dist/ag-grid.min.css" rel="stylesheet" type="text/css">
  <!-- <link href="bower_components/ag-grid/dist/ag-grid.css" rel="stylesheet" type="text/css"> -->

  <link href='bower_components/angular-loading-bar/build/loading-bar.min.css' rel='stylesheet' type='text/css'>

  <!-- <link rel="stylesheet" href="bower_components/angular-ui-tree/dist/angular-ui-tree.min.css" type="text/css"> -->

  <!-- user space css -->
  <link href="app/common/css/app.css" rel="stylesheet" type="text/css">
  <link href="app/common/css/bootstrap-user.css" rel="stylesheet" type="text/css">
  <link href="app/common/css/bootstrap-no-rounded-corners.css" rel="stylesheet" type="text/css">
  <link ng-href="app/common/css/{{l10nLangKey}}.nt-theme.css" rel="stylesheet" type="text/css">
  <link href="app/common/css/bootstrap-panel-compact.css" rel="stylesheet" type="text/css">
  <link href="app/common/css/bootstrap-btn-circle.css" rel="stylesheet" type="text/css">
  <link href="app/common/css/ajax.css" rel="stylesheet" type="text/css">
  <!-- <link href="app/common/css/ag-grid-theme.css" rel="stylesheet" type="text/css"> -->
  <link href="app/common/css/ag-grid-bootstrap-tree.css" rel="stylesheet" type="text/css">
  <link href="app/common/css/smart-table.css" rel="stylesheet" type="text/css">

  <!-- HTML5 Shim and Respond.js IE8 support of HTML5 elements and media queries -->
  <!-- WARNING: Respond.js doesn't work if you view the page via file:// -->
  <!--[if lt IE 9]>
    <script src="bower_components/html5shiv/dist/html5shiv.min.js"></script>
    <script src="bower_components/respond/dest/respond.min.js"></script>
  <![endif]-->

  <script type="text/javascript">
    var G_DDOS_ENABLED = <?=$settings->ANALYZER_DDOS_ENABLED ? 1 : 0?>;
  </script>

  <style type="text/css">
    [ng\:cloak], [ng-cloak], [data-ng-cloak], [x-ng-cloak], .ng-cloak, .x-ng-cloak {
      display: none !important;
    }
    .translate-cloak {
      display: none !important;
    }
  </style>
</head>

<body>
  <!--[if lt IE 7]>
    <p class="browsehappy">You are using an <strong>outdated</strong> browser. Please <a href="http://browsehappy.com/">upgrade your browser</a> to improve your experience.</p>
  <![endif]-->

  <div ng-cloak translate-cloak>
    <div ng-include="'<?=$nav?>'"></div>
    <div class="container-fluid">
      <div ui-view></div>
    </div>
  </div>

  <loading></loading>

  <!-- lib components JavaScript -->
  <script src="lib/amcharts/amcharts.js"></script>

  <!-- bower_components JavaScript -->

  <script src="bower_components/jquery/dist/jquery.min.js"></script>
  <!-- <script src="bower_components/jquery/dist/jquery.js"></script> -->

  <script src="bower_components/moment/min/moment.min.js"></script>
  <!-- <script src="bower_components/moment/moment.js"></script> -->

  <script src="bower_components/angular/angular.min.js"></script>
  <!-- <script src="bower_components/angular/angular.js"></script> -->
  <script src="bower_components/angular-sanitize/angular-sanitize.min.js"></script>
  <!-- <script src="bower_components/angular-sanitize/angular-sanitize.js"></script> -->
  <script src="bower_components/angular-cookies/angular-cookies.min.js"></script>
  <!-- <script src="bower_components/angular-cookies/angular-cookies.js"></script> -->

  <?php
    switch ($l10nLangKey) {
      case 'ru': echo '<script src="bower_components/angular-i18n/angular-locale_ru.js"></script>'; break;
      case 'en':
      default: echo '<script src="bower_components/angular-i18n/angular-locale_en.js"></script>'; break;
    }
  ?>

  <script src="bower_components/angular-ui-router/release/angular-ui-router.min.js"></script>
  <!-- <script src="bower_components/angular-ui-router/release/angular-ui-router.js"></script> -->

  <script src="bower_components/angular-bootstrap/ui-bootstrap-tpls.min.js"></script>
  <!-- <script src="bower_components/angular-bootstrap/ui-bootstrap-tpls.js"></script> -->

  <script src="bower_components/angular-ui-utils/ui-utils.min.js"></script>
  <!-- <script src="bower_components/angular-ui-utils/ui-utils.js"></script> -->

  <script src="bower_components/ui-select/dist/select.min.js"></script>
  <!-- <script src="bower_components/ui-select/dist/select.js"></script> -->

  <script src="bower_components/angular-ui-ace/ui-ace.min.js"></script>
  <!-- <script src="bower_components/angular-ui-ace/ui-ace.js"></script>-->
  <script src="bower_components/ace-builds/src-min-noconflict/ace.js"></script>

  <script src="bower_components/angular-loading-bar/build/loading-bar.min.js"></script>

  <script src="bower_components/three.js/three.min.js"></script>
  <!-- <script src="bower_components/three.js/three.js"></script> -->
  <script src="bower_components/stats.js/index.js"></script>
  <script src="lib/three.js/TrackballControls.js"></script>
  <script src="lib/three.js/OrbitControls.js"></script>
  <script src="lib/three.js/TypedGeometry.js"></script>
  <script src="lib/three.js/IndexedTypedGeometry.js"></script>
  <script src="lib/three.js/PlaneTypedGeometry.js"></script>
  <script src="lib/three.js/Lut.js"></script>

  <script src="bower_components/d3/d3.min.js"></script>
  <!-- <script src="bower_components/d3/d3.js"></script> -->

  <script src="bower_components/angular-smart-table/dist/smart-table.min.js"></script>
  <!-- <script src="bower_components/angular-smart-table/dist/smart-table.js"></script> -->

  <script src="bower_components/ag-grid/dist/ag-grid.min.js"></script>
  <!-- script src="bower_components/ag-grid/dist/ag-grid.js"></script -->

  <script src="bower_components/angular-translate/angular-translate.min.js"></script>
  <!-- script src="bower_components/angular-translate/angular-translate.js"></script -->
  <script src="bower_components/angular-translate-loader-partial/angular-translate-loader-partial.min.js"></script>
  <!-- script src="bower_components/angular-translate-loader-partial/angular-translate-loader-partial.js"></script -->
  <script src="bower_components/angular-translate-storage-cookie/angular-translate-storage-cookie.min.js"></script>
  <!-- script src="bower_components/angular-translate-storage-cookie/angular-translate-storage-cookie.js"></script -->
  <!-- <script src="bower_components/angular-ui-tree/dist/angular-ui-tree.min.js"></script> -->
  <script src="bower_components/bootstrap-ui-datetime-picker/dist/datetime-picker.min.js"></script>

  <!-- user space JavaScript -->
  <script src="app/common/js/directives/directives-common.js"></script>
  <script src="app/common/js/directives/directive-input-mask.js"></script>
  <script src="app/common/js/filters/format-size.js"></script>
  <script src="app/common/js/ddos-ajax.js"></script>
  <script src="app/common/js/ag-tree.js"></script>
  <script src="app/common/js/services/kroz-authenticate.js"></script>

  <script src="app/common/js/ddos-view.js"></script>

  <script src="app/state/js/state.js"></script>

  <script src="app/network/js/network.js"></script>
  <script src="app/network/js/scheme.js"></script>
  <script src="app/network/js/chartTemplate.js"></script>
  <script src="app/network/js/chartSettings.js"></script>

  <script src="app/common/js/directives/directive-diag.js"></script>
  <script src="app/common/js/directives/directive-chart.js"></script>

  <script src="app/common/js/three-chart/Chart.js"></script>
  <script src="app/common/js/three-chart/Space.js"></script>
  <script src="app/common/js/three-chart/Floor.js"></script>
  <script src="app/common/js/three-chart/Grid.js"></script>
  <script src="app/common/js/three-chart/Axis.js"></script>
  <script src="app/common/js/three-chart/Graph.js"></script>
  <script src="app/common/js/three-chart/Utils.js"></script>
  <script src="app/common/js/three-chart/Magnifier.js"></script>

  <script src="app/objects/js/objects.js"></script>
  <script src="app/common/js/directives/directive-smart-table.js"></script>

  <!-- traffic -->
  <script src="app/traffic/manager/js/manager.js"></script>
  <script src="app/traffic/capture/js/capture.js"></script>
  <script src="app/traffic/urlblocker/js/urlblocker.js"></script>
  <script src="app/traffic/urlblocker/lib/ng-csv.min.js"></script>

  <script src="app/attacks/js/attacks.js"></script>
  <script src="app/attacks/js/attacks-filter.js"></script>

  <script src="app/settings/js/settings.js"></script>
  <script src="app/settings/bgp/js/bgp.js"></script>
  <script src="app/settings/smtp/js/smtp.js"></script>

</body>

</html>
