# Webui

### To install and run (as administrator):
    1. git
    2. nodejs and npm
        * ubuntu
            curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash -
            sudo apt-get install -y nodejs

### Install:
    1. npm install -g bower (as administrator)
    2. cd webui/
    3. npm install && bower install

### Configure
    1. apache2 (for another webserver read their manuals)
        * sudo a2enmod rewrite
        * Enable the use of .htaccess files by changing AllowOverride None to AllowOverride All. For example the default website, edit /etc/apache2/sites-available/default:
            > <Directory /var/www/>
            >     Options Indexes FollowSymLinks MultiViews
            >     # changed from None to All
            >     AllowOverride All
            >     Order allow,deny
            >     allow from all
            > </Directory>
        * sudo service apache2 restart
        * Basic auth cmd: "htpasswd -cd .htpasswd admin"
    2. php:
        * May need to disable display_errors = Off config option. For apache2 file is: /etc/php5/apache2/php.ini

### Development
    #### Frontend
        1. resources
            1. JS: angular.js: https://angularjs.org/
            2. CSS: bootstrap: latest. http://getbootstrap.com/
            3. Fonts: font-awesome: latest. http://fontawesome.io/icons/
            4. Other: all additional modules and libs you can found in
                * ./webui/bower.json, blocks: 'dependencies', 'devDependencies'.
                * ./webui/lib. ATTENTION: some of these files may be patched!
        2. structure:
            > - index.php - entry point. Includes all css, js etc files. Defines ng-app (krozView), root routing( ui-router component ) navigation.
            > - app/ - root of application.
            > - app/common - common functionality for the whole application: css styles, angular directives, filters, php backend base classes and utils
            > - app/* - modules for each root navigation state( see app/common/kroz-view.js:$stateProvider and 'navbar' in app/common/html/nav.html )
            > - app/*/* - each module contains some folders:
            > > - app/*/html - partials(templates), that will be compiled into application.
            > > - app/*/js - all angularjs logic specific for module: controllers, services etc.
            > > - app/*/php - all backend(php) logic specific for module. 'modrewrite' used here.
            > > - app/*/l10n - all localization files specific for module.
    #### Backend
        1. php5

### Known errors:
        1.Linux Mint 17 Qiana can have the problem with mod_rewrite. You will see it right after login at debug Console. Possible solution:
            a2dismod rewrite; service apache2 restart; // result: OK
            a2enmod rewrite; service apache2 restart; // result: OK
