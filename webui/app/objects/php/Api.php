<?php
require_once dirname(__FILE__) . '/../../common/php/Base.php';
require_once dirname(__FILE__) . '/Objects.php';

//-----------------------------------------------------------------------------
/**
* Api to handle client requestas
*/
class Api extends ApiBase
{
    protected function processGet($query)
    {
        $objectsModule = new Objects();
        switch ( $query['action'] ) {
            case 'objects':
                return $objectsModule->getAll();
            case 'details':
                return $objectsModule->getObjectDetails($query);
            case 'rules':
                return $objectsModule->getBlockerRules($query);
            case 'reports':
                if ( array_key_exists('all', $query) )
                    return $objectsModule->getReports($query);
                return $objectsModule->getReportsOnInterval($query);
            case 'availableMitigationMeasuresList':
                return $objectsModule->getAvailableMitigationMeasuresList();

            default:
                break;
        }

        throw new RuntimeException('Api:processGet: bad request');
    }

    protected function processPost($query, $object)
    {
        $objectsModule = new Objects();
        switch ( $query['action'] ) {
            case 'save':
                return $objectsModule->saveObjectDetails($query, $object);
            case 'ruleAdd':
                return $objectsModule->addRule($query, $object);
            case 'ruleRemove':
                return $objectsModule->removeRule($query, $object);
            case 'ruleReplace':
                return $objectsModule->replaceRule($query, $object);
            case 'remove':
                return $objectsModule->removeObject($query, $object);
            default:
                break;
        }

        throw new RuntimeException('Api:processPost: bad request');
    }
}

//-----------------------------------------------------------------------------
if ( PHP_SAPI == 'cli' ) { // test
    $_SERVER['REQUEST_METHOD'] = 'GET';

    // all reports
    echo "\n\n\thttp://localhost/app/objects/reports/all\n";
    echo "====================================================================\n";
    $_GET = array(
        'action' => 'reports',
        'all' => ''
    );
    ApiFactory::process('Api');
    exit();
}

ApiFactory::process('Api');
