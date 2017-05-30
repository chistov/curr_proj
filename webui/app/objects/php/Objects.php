<?php
require_once dirname(__FILE__) . '/../../common/php/Base.php';
require_once dirname(__FILE__) . '/../../attacks/php/Attacks.php';

//-----------------------------------------------------------------------------
/**
 * Module to work with objects
 */
class Objects extends ModuleBase
{
    private $fromDate;
    private $toDate;

    private $ddosLimitsMax = array(
        'l2' => 0,
        'icmp' => 0,
        'ip_fragments' => 0,
        'tcp' => 0,
        'udp' => 0,
        'tcp_malformed' => 0,
        'l7' => 0,
        'dns' => 0,
        'ntp' => 0,
        'sip' => 0,
        'smtp' => 0,
        'ftp' => 0,
        'http_bad' => 0,
        'http_flood' => 0,
        'http_slow' => 0
    );
    private $ddosLimitsAvg = array(
        'l2' => 0,
        'icmp' => 0,
        'tcp' => 0,
        'udp' => 0,
        'l7' => 0,
        'dns' => 0,
        'ntp' => 0,
        'sip' => 0,
        'smtp' => 0,
        'ftp' => 0,
        'http_bad' => 0,
        'http_flood' => 0,
    );
    private $ddosLevel = array(
        'advanced_edit_mode' => false,
        'name' => "",
        'enabled' => false,
        'avg_accumulate_time' => 0,
        'proxy_attackers_level' => 0,
        'proxy_time' => 0,
        'peers_limit' => 0,
        // 'mitigation_enabled' => false,
        // 'mitigation' => array(),
        'limits' => array(
            'max' => null,
            'avg' => null
        )
    );
    private $ddosMitigation = array(
        'block_time_attacker' => 0,
        'block_time_attacked' => 0,
        'dynamic_rules' => array(
            'enabled' => true,
            'src_ip' => true,
            'src_port' => false,
            'dst_ip' => false,
            'dst_port' => false,
        ),

        'static_rules' => array(
            'enabled' => false,
            // rules: ();
        ),

        'abnormal_filter_enabled' => false,

        'l4_proxy' => array(
            'enabled' => false,
            'syn' => false
        ),
        'script_enabled' => false
    );

    /**
     */
    private $ddosObjectConfPath = '';
    private $ddosObject = array();

    const IP_CHECK_PATTERN = '/^[!]*\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?:\/\d{1,2})?$/';

    private $currentObjectId = -1; // -1 - all
    private $attacksModule = null;
    private $reports = array();

    public function __construct()
    {
        parent::__construct();
        $this->attacksModule = new Attacks();

        $this->fromDate = new DateTime( '1970-01-01 00:00:00' );
        $this->toDate = new DateTime( 'tomorrow' );

        $this->ddosLevel['limits']['max'] = $this->ddosLimitsMax;
        $this->ddosLevel['limits']['avg'] = $this->ddosLimitsAvg;
        // Struct as G100/feeder2/ddos/draft.object.conf
        $this->ddosObject = array(
            'name' => "",
            'value' => "",
            'additional_values' => "",
            'safe_level_bps' => 0,
            'safe_level_pps' => 0,
            'high_severity_bps' => 0,
            'high_severity_pps' => 0,
            'ddos_levels' => array(
                'LEVEL1' => $this->ddosLevel,
                'LEVEL2' => $this->ddosLevel,
                'LEVEL3' => $this->ddosLevel
            )
        );
    }

    //-------------------------------------------------------------------------
    /**
     * Main routine to get list of all objects
     *
     * @return array
     */
    public function getAll()
    {
        $dir = glob($this->settings->OBJECTS_DIR ."/*object.conf");

        $arr = array('objects' => array());
        foreach ($dir as $objectFile) {
          $tmp = explode(".", basename($objectFile));
          $id = $tmp[0];
          if($id == 'draft') continue;

          $fileCont = file_get_contents($objectFile);
          preg_match('#name = "(.*)"#U',$fileCont, $name);
          preg_match('#value = "(.*)"#U',$fileCont, $value);

          $arr['objects'][] = array(
            "data" => array(
              "id" => $id,
              "name" => $name[1],
              "value" => $value[1]
            )
          );
        }
        return $arr;
    }
    //-------------------------------------------------------------------------

    /**
     * Remove specified object
     *
     * @param array $metadata
     * @param array $object
     */
    public function removeObject($metadata, $args){
        $count = 0;
        foreach($args['ids'] as $id){
            if ( !$this->hasUserPermissions($id) )
                throw new Exception("You do not have permissions to do that");

            if ( $id == 0 )
                throw new Exception("Objects:removeObject: error to delete global object");
            if ( !File::delete( "{$this->settings->OBJECTS_DIR}/{$id}.mailing.list" ) )
                throw new Exception("Objects:removeObject: error to delete mailing list");
            if ( !File::delete( "{$this->settings->OBJECTS_DIR}/{$id}.object.conf" ) )
                throw new Exception("Objects:removeObject: error to delete object conf");
            if ( !File::delete( "{$this->settings->MITIGATION_DIR}/{$id}.mitigation_measures.conf" ) )
                throw new Exception("Objects:removeObject: error to delete measures conf");

            File::delete( "{$this->settings->OBJECTS_DIR}/{$id}.script.clean");
            File::delete( "{$this->settings->OBJECTS_DIR}/{$id}.script.critical");
            ++$count;
        }
        $this->result->addMessage( ReturnResult::MESSAGE_SUCCESS,
          Translate::gettext('OBJECTS.TITLE_OBJECT_DELETE_SUCCESS') . ": " .$count);
        return $this->getAll();
    }

    //-------------------------------------------------------------------------
    /**
     * Get object details
     *
     * @param array $metadata
     * @return array
     */
    public function getObjectDetails($metadata)
    {
        $attackReports = array(
            'filter' => array(
                'all' => true,
                'from' => array(),
                'to' => array()
            ),
            'data' => array()
        );

        $getDraft = $metadata['id'] == 'draft';
        if ( !$getDraft && !$this->hasUserPermissions($metadata['id']) )
            throw new Exception("You do not have permissions to do that");

        $out['id'] = $metadata['id'];
        $out['attackReports'] = $attackReports;
        $out['attackEmailing'] = !$getDraft ? $this->getMailingList($metadata['id']) : array();
        $out['ddosObject'] = $this->getDdosObject($metadata['id']);
        $out['whiteList'] = !$getDraft ? $this->getWhiteList() : array();

        return $out;
    }

    //-------------------------------------------------------------------------
    /**
     * Main routine to building reports from attack files
     *
     * @return array
     */
    public function getReports($metadata)
    {
        if ( !$this->hasUserPermissions($metadata['id']) )
            throw new Exception("You do not have permissions to do that");

        // составление отчетов
        if ( isset($metadata['id']) && $metadata['id'] != '' )
            $this->currentObjectId = $metadata['id'];

        $this->reports = array();
        $this->attacksModule->foreachAttackFiles(
            $this->fromDate->getTimestamp(),
            $this->toDate->getTimestamp(),
            array($this, 'processAttackFile'));

        rsort( $this->reports );
        return $this->reports;
    }

    //-------------------------------------------------------------------------
    /**
     * Routine to get reports in interval
     *
     * @param array $metadata
     *
     * @return array
     */
    public function getReportsOnInterval($metadata)
    {
        if ( !$this->hasUserPermissions($metadata['id']) )
            throw new Exception("You do not have permissions to do that");

        if ($metadata['from'])
            $this->fromDate->setTimestamp($metadata['from']);

        if ($metadata['to'])
            $this->toDate->setTimestamp($metadata['to']);

        return $this->getReports($metadata);
    }

    //-------------------------------------------------------------------------
    /**
     * Callback to process prepared attack file
     *
     * @param string $filePathname
     * @param array  $fileParsed
     *
     */
    public function processAttackFile($filePathname, $fileParsed)
    {
        if ($this->currentObjectId >= 0 &&
            $this->currentObjectId != $fileParsed['objectId'])
            return;

        // aggregate by date
        $date = $fileParsed['date']->format('Y-m-d');
        $this->aggregateBy($date, '', $this->reports);

        // add info to report
        $this->addToReport( dirname($filePathname), $fileParsed, $this->reports[$date] );
    }

    //-------------------------------------------------------------------------
    /**
     * Save object to conf files
     *
     * @param array $metadata
     * @param array $object
     *
     * @return boolean
     */
    public function saveObjectDetails($metadata, $object)
    {
        $creating = array_key_exists('creating', $object);
        unset($object['creating']);
        if ($creating)
            $object['id'] = $this->getObjectLastId() + 1;

        if ( !$this->hasUserPermissions($object['id']) )
            throw new Exception("You do not have permissions to do that");

        // return;
        $ret = $this->saveDdosObject( $object['ddosObject'], $object['id'] );
        if ($ret !== false)
            $ret = $this->saveMailingList( $object['attackEmailing'], $object['id'] );

        if ($ret === false)
            throw new Exception("Objects:save: error to save object parameters");
        else {
            if ($creating)
                $this->setObjectLastId($object['id']);

            $this->result->addMessage( ReturnResult::MESSAGE_SUCCESS,
                Translate::gettext($creating ? 'OBJECTS.TITLE_OBJECT_CREATE_SUCCESS' : 'OBJECTS.TITLE_OBJECT_SAVE_SUCCESS',
                $object['ddosObject']['name'])
            );
        }

        return array(
            'objects' => $this->getAll(),
            'details' => $object
            );
    }

    //-------------------------------------------------------------------------
    /**
     * Get all active rules on blocker
     *
     * @param array $metadata
     *
     */
    public function getBlockerRules($metadata)
    {
        if ( !$this->hasUserPermissions($metadata['id']) )
            throw new Exception("You do not have permissions to do that");

        $rulesFile = "{$this->settings->BLOCKER_DIR}/stat/rules_db";
        if ( !File::isAvailableToRead($rulesFile) )
            return array();

        $rulesOut = array();
        $onLine = function($header, $line, $lineIndex) use (&$rulesOut)
        {
            if (count($line) != count($header))
                return false;

            static $idx = 0;

            $rulesOut['rulesTree'][$idx]['data'] = array_combine( array_flip($header), $line);
            // TO ISO8601 for client
            $rulesOut['rulesTree'][$idx]['data']['begin'] = date("d.m.Y h.i.s", $rulesOut['rulesTree'][$idx]['data']['begin']);
            $rulesOut['rulesTree'][$idx]['data']['end'] = date("d.m.Y h.i.s", $rulesOut['rulesTree'][$idx]['data']['end']);

            // Get string duration and valid units
            $duration = $rulesOut['rulesTree'][$idx]['data']['duration'];
            $d = floor($duration/3600/24);
            $h = ($duration/3600)%24;
            $m = ($duration/60)%60;
            $s = $duration%60;

            $rulesOut['rulesTree'][$idx]['data']['durationStr'] = sprintf("%dd %02d:%02d:%02d", $d, $h, $m, $s);
            if ( $s )
                $rulesOut['rulesTree'][$idx]['data']['durationUnits'] = 's';
            else if ( $m ){
                $rulesOut['rulesTree'][$idx]['data']['duration'] = $duration/60;
                $rulesOut['rulesTree'][$idx]['data']['durationUnits'] = 'm';
            }
            else if ( $h ){
                $rulesOut['rulesTree'][$idx]['data']['duration'] = $duration/3600;
                $rulesOut['rulesTree'][$idx]['data']['durationUnits'] = 'h';
            }
            else if ( $d ){
                $rulesOut['rulesTree'][$idx]['data']['duration'] = $duration/3600/24;
                $rulesOut['rulesTree'][$idx]['data']['durationUnits'] = 'd';
            }
            else
                $rulesOut['rulesTree'][$idx]['data']['durationUnits'] = 's';

            $rulesOut['rulesTree'][$idx]['group'] = false;
            ++$idx;
        };

        File::readCsvFile($rulesFile, $onLine, ",");
        return $rulesOut;
    }

    //-------------------------------------------------------------------------
    /**
     * Routine to add individual rule to blocker
     */
    public function addRule($metadata, $object)
    {
        if ( !$this->hasUserPermissions($metadata['id']) )
            throw new Exception("You do not have permissions to do that");

        $cmd = $this->parseClientRuleToCmd($object, true);
        $this->executeRuleSenderCmd($cmd);
        sleep(1);
        $this->result->addMessage(
            ReturnResult::MESSAGE_SUCCESS,
            Translate::gettext('OBJECTS.TITLE_RULE_ADD_SUCCESS'), $cmd );
        return /*true; //*/$this->getBlockerRules($metadata);
    }

    //-------------------------------------------------------------------------
    /**
     * Routine to remove individual rule from blocker
     */
    public function removeRule($metadata, $object)
    {
        if ( !$this->hasUserPermissions($metadata['id']) )
            throw new Exception("You do not have permissions to do that");

        foreach($object as $rule)
          $cmd .= $this->parseClientRuleToCmd($rule, false) . "\n";

        $this->executeRuleSenderCmd($cmd);
        $this->result->addMessage( ReturnResult::MESSAGE_SUCCESS,
            count($object) . ' '. Translate::gettext('OBJECTS.TITLE_RULE_DELETE_SUCCESS'), $cmd );
        return /*true; //*/$this->getBlockerRules($metadata);
    }

    //-------------------------------------------------------------------------
    /**
     * Routine to replace individual rule on blocker
     */
    public function replaceRule($metadata, $object)
    {
        if ( !$this->hasUserPermissions($metadata['id']) )
            throw new Exception("You do not have permissions to do that");

        $current = $object['current'];
        $cmdRemove = $this->parseClientRuleToCmd($current, false);
        $new = $object['new'];
        $cmdAdd = $this->parseClientRuleToCmd($new, true);

        $getCmdBody = function($cmd) {
            $begin = strpos($cmd, '-t '); // action
            $end = strpos($cmd, ' -T '); // timeout
            return $begin !== false && $end !== false ?
                substr($cmd, $begin, $end - $begin) : $cmd;
        };

        if ( $getCmdBody($cmdRemove) !== $getCmdBody($cmdAdd) ) // check rule similar
            $this->executeRuleSenderCmd($cmdRemove);

        $this->executeRuleSenderCmd($cmdAdd);
        sleep(1);
        $this->result->addMessage( ReturnResult::MESSAGE_SUCCESS,
            Translate::gettext('OBJECTS.TITLE_RULE_UPDATE_SUCCESS'), $cmdAdd );
        return /*true; //*/$this->getBlockerRules($metadata);
    }

    //-------------------------------------------------------------------------
    /**
     */
    public function getAvailableMitigationMeasuresList()
    {
        $measures_array = array();
        $MM_HTML_REGEXP = '/(.+)_mitigation_measure\.html/';

        $cur_dir = getcwd();
        chdir( $this->settings->DDOS_MMD_DIR );
        foreach ( glob( "*mitigation_measure.html" ) as $filename) {
            if ( preg_match( $MM_HTML_REGEXP, $filename, $matches ) )
            {
                $realpath = 'mitigation_measures/' . $matches[1] . '_mitigation_measure' . '.html';
                $measures_array[ strtoupper( $matches[1] ) ] = $realpath;
            }
        }
        chdir($cur_dir);

        return $measures_array;
    }

    //-------------------------------------------------------------------------
    /**
     * Aggregate record by value
     *
     * @param string
     * @param string
     * @param mixed
     *
     */
    protected function aggregateBy($value, $parent, &$out)
    {
        if ( !isset($out[$value]) ) {
            $out[$value] = array(
                'date' => $value,
                'criticalAttacks' => 0,
                'allAttacks' => 0,
                'attackers' => 0,
                'attacked' => 0,
                'levelAverage' => 0,
                'levelSummary' => 0,
                'levelMaximum' => 0
            );
        }
    }

    //-------------------------------------------------------------------------
    /**
     * Add fields from attack file to report
     *
     * @param string
     * @param array
     * @param mixed
     *
     */
    protected function addToReport($attackFilePathname, $parsedAttackName, &$report)
    {
        $criticalPattern = 'critical';
        $speedPattern = 'speed: ';
        $bitDimPattern = '(bit/s)';
        $bpsDimPattern = 'bps';

        $levelSummary = 0;
        $isCritical = false;
        $attacked = 0;
        $attackers = 0;
        $levelAverage = $report['levelAverage'];
        $levelMaximum = $report['levelMaximum'];
        $wasSpeedStats = false;
        $file = new _File($attackFilePathname."/info");
        while ( ($line = fgets($file->handle)) !== false ) {
            $prop   = substr($line, 0, strpos($line, ':'));
            $value  = trim( str_replace($prop . ':', '', $line));

            switch ($prop) {
                case 'to':
                    ++$attacked;
                    break;
                case 'from':
                    ++$attackers;
                    break;
                default:
                    break;
            }
        }

        if(file_exists($attackFilePathname."/stats")){
            $file = new _File($attackFilePathname."/stats");
            while ( ($line = fgets($file->handle)) !== false ) {
                $prop   = substr($line, 0, strpos($line, ':'));
                $value  = trim( str_replace($prop . ':', '', $line));
                $speedPos = strpos($value, $speedPattern);
                if ($speedPos !== FALSE) {
                    $wasSpeedStats = true;
                    if ( !$isCritical ) { // critical not found
                        $criticalPos = substr($value, $speedPos - strlen($criticalPattern) - 1, strlen($criticalPattern) );
                        $isCritical = ($criticalPos == $criticalPattern);
                    }

                    $bitValue = 0;
                    $bitValuePos = $speedPos + strlen($speedPattern); // start of value
                    $bitDimPos = strpos($value, $bpsDimPattern, $bitValuePos);
                    if ($bitDimPos !== FALSE) {
                        $bitValue = substr($value, $bitValuePos, $bitDimPos - $bitValuePos);
                        $bitValue = floatval($bitValue);
                        $suffix = $value[$bitDimPos-1];
                        switch ($suffix) {
                            case 'T': $bitValue *= 1000*1000*1000*1000; break;
                            case 'G': $bitValue *= 1000*1000*1000; break;
                            case 'M': $bitValue *= 1000*1000; break;
                            case 'K': $bitValue *= 1000; break;
                            default: break;
                        }
                    } else {
                        $bitDimPos = strpos($value, $bitDimPattern, $bitValuePos); // end of value
                        if ($bitDimPos !== false)
                            $bitValue = intval( str_replace('`', '', substr($value, $bitValuePos, $bitDimPos - $bitValuePos )) );
                    }

                    if ($bitValue) {
                        $levelAverage = round( ($levelAverage + $bitValue)/2 );
                        $levelSummary = round( ($levelSummary + $bitValue)/2 );
                        if ( $levelMaximum < $bitValue )
                            $levelMaximum = $bitValue;
                    }
                }
            }
        }
        else if(file_exists($attackFilePathname."/stats.csv")){
            $container['levelAverage'] = $report['levelAverage'];
            $container['levelMaximum'] = $report['levelMaximum'];
            $container['levelSummary'] = 0;
            Utils::readCsvFile($attackFilePathname."/stats.csv", function($header, $row, $curr_idx) use (&$container) {
                $container['levelAverage'] = round( ($container['levelAverage'] + $row[ $header['bps_raw'] ])/2 );
                $container['levelSummary'] = round( ($container['levelSummary'] + $row[ $header['bps_raw'] ])/2 );
                if ( $container['levelMaximum'] < $row[ $header['bps_raw'] ] )
                    $container['levelMaximum'] = $row[ $header['bps_raw'] ];
            });
        }
        else
            throw new Exception("stats file not found");

        if (!$wasSpeedStats)
            return;

        $report['attacked'] += $attacked;
        $report['attackers'] += $attackers;
        ++$report['allAttacks'];
        if ($isCritical)
            ++$report['criticalAttacks'];

        if(isset($container)){
            $report['levelSummary'] += $container['levelSummary'];
            $report['levelAverage'] = $container['levelAverage'];
            $report['levelMaximum'] = $container['levelMaximum'];
        }
        else{
            $report['levelSummary'] += $levelSummary;
            $report['levelAverage'] = $levelAverage;
            $report['levelMaximum'] = $levelMaximum;
        }

    }

    //-------------------------------------------------------------------------
    /**
     * Parse mailing list
     *
     * @param integer $objectId
     *
     * @return array
     */
    protected function getMailingList($objectId)
    {
        $listPathname = "{$this->settings->OBJECTS_DIR}/{$objectId}.mailing.list";

        $listOut = array();
        $onLine = function($header, $line, $lineIndex) use (&$listOut)
        {
            if ( count($header) != count($line) )
                return;
            $listOut[] = array_combine( array_flip($header), $line);
        };

        File::readCsvFile($listPathname, $onLine, ";");
        return $listOut;
    }

    //-------------------------------------------------------------------------
    /**
     */
    protected function saveMailingList($mailingList, $objectId)
    {
        $csvList = "";
        foreach ($mailingList as $mailEntry) {
            if ( empty($csvList) ) // fill header
                $csvList .= implode(';', array_keys($mailEntry)) . "\n";
            $csvList .= implode(';', $mailEntry) . "\n";
            Utils::checkIp($mailEntry['ipMask'], get_class($this).":". __FUNCTION__);
        }

        $listPathname = "{$this->settings->OBJECTS_DIR}/{$objectId}.mailing.list";
        return File::put($listPathname, $csvList) !== false;
    }

    //-------------------------------------------------------------------------
    /**
     * Get limits from config file
     *
     * @param integer $objectId
     *
     * @return array
     */
    protected function getDdosObject($objectId)
    {
        $confPathname = "{$this->settings->OBJECTS_DIR}/{$objectId}.object.conf";
        if ( !File::isAvailableToRead($confPathname) )
            throw new Exception("Objects:getDdosObject: config file is not available for read");

        $this->ddosObjectConfPath = $confPathname;
        $this->getDdosObjectConf($this->ddosObject);
        if (!empty($this->ddosObject['additional_values'])) {
            $this->ddosObject['value'] .= "\n" . preg_replace('/[\s,\n|;]+/', "\n", $this->ddosObject['additional_values']);
        }

        // fill mitigaion measures
        $mitigationPathname = "{$this->settings->MITIGATION_DIR}/{$objectId}.mitigation_measures.conf";
        $mitigation = null;
        if ( File::isAvailableToRead($mitigationPathname) )
            $mitigation = @json_decode(file_get_contents($mitigationPathname)); // decode as object!

        if ( !is_null($mitigation) ) {
            $mitigation = $mitigation->mitigation_strategy->ddos_levels;
            foreach ($this->ddosObject['ddos_levels'] as $key => &$value) {
                if ( !isset($mitigation->{$key}) )
                    continue;

                $value['mitigation_enabled'] = $mitigation->{$key}->enabled;
                $value['mitigation'] = $mitigation->{$key}->mitigation;
            }
        }

        // TODO TMP Script GET
        // $scripts = array(
        //     'clean' => "{$this->settings->OBJECTS_DIR}/{$objectId}.script.clean",
        //     // 'critical' => "{$this->settings->OBJECTS_DIR}/{$objectId}.script.critical"
        // );
        // foreach ($scripts as $key => $scriptPathname) {
        //     if ( File::isAvailableToRead($scriptPathname) )
        //         $this->ddosObject['ddos_levels'][$key]['mitigation']['script_content'] = file_get_contents($scriptPathname);
        //     else
        //         $this->ddosObject['ddos_levels'][$key]['mitigation']['script_content'] = "#!/bin/bash\n\nexit 0\n";
        // }

        return $this->ddosObject;
    }

    //-------------------------------------------------------------------------
    /**
     * Save limits to config file
     *
     * @param array $ddosLevelsSet
     * @param integer $objectId
     *
     * @return boolean
     */


    protected function prettyPrint( $json )
    {
        $result = '';
        $level = 0;
        $in_quotes = false;
        $in_escape = false;
        $ends_line_level = NULL;
        $json_length = strlen( $json );

        for( $i = 0; $i < $json_length; $i++ ) {
            $char = $json[$i];
            $new_line_level = NULL;
            $post = "";
            if( $ends_line_level !== NULL ) {
                $new_line_level = $ends_line_level;
                $ends_line_level = NULL;
            }
            if ( $in_escape ) {
                $in_escape = false;
            } else if( $char === '"' ) {
                $in_quotes = !$in_quotes;
            } else if( ! $in_quotes ) {
                switch( $char ) {
                    case '}': case ']':
                        $level--;
                        $ends_line_level = NULL;
                        $new_line_level = $level;
                        break;

                    case '{': case '[':
                        $level++;
                    case ',':
                        $ends_line_level = $level;
                        break;

                    case ':':
                        $post = " ";
                        break;

                    case " ": case "\t": case "\n": case "\r":
                        $char = "";
                        $ends_line_level = $new_line_level;
                        $new_line_level = NULL;
                        break;
                }
            } else if ( $char === '\\' ) {
                $in_escape = true;
            }
            if( $new_line_level !== NULL ) {
                $result .= "\n".str_repeat( "\t", $new_line_level );
            }
            $result .= $char.$post;
        }

        return $result;
    }


    //-------------------------------------------------------------------------
    /**
     * Save limits to config file
     *
     * @param array $ddosLevelsSet
     * @param integer $objectId
     *
     * @return boolean
     */


    protected function saveDdosObject($ddosLevelsSet, $objectId)
    {
        // IMPORTANT!!!
        // logic with tmp file and file_put_contents needed for g100 read change algo: inotify
        $confPathname = "{$this->settings->OBJECTS_DIR}/{$objectId}.object.conf";
        $this->ddosObjectConfPath = tempnam("/tmp", "ddos_obj");
        if ( !File::isAvailableToRead($confPathname) ) {
            if ( !copy("{$this->settings->OBJECTS_DIR}/draft.object.conf", $this->ddosObjectConfPath) ) // copy from draft
                throw new Exception("Objects:saveDdosObject: config file is not available for read");
        } else
            copy($confPathname, $this->ddosObjectConfPath);

        $values = preg_split('/[\s,\n|;]+/', $ddosLevelsSet['value'], -1, PREG_SPLIT_NO_EMPTY);
        foreach ($values as $value)
            Utils::checkIp($value, get_class($this).":". __FUNCTION__);

        $ddosLevelsSet['value'] = $values[0];
        unset($values[0]);
        $ddosLevelsSet['additional_values'] = implode(';', $values);

        Utils::checkIp($ddosLevelsSet['value'], get_class($this).":". __FUNCTION__);

        // save mitigations
        {
            $ddosMitigations = array(
                'mitigation_strategy' => array(
                    'ddos_levels' => array()
                ));
            $ddosMitigationsLevels = &$ddosMitigations['mitigation_strategy']['ddos_levels'];
            foreach ($ddosLevelsSet['ddos_levels'] as $key => &$value) {
                // to use empty measures objects instead of arrays...
                foreach ($value['mitigation'] as $index => $mitigation)
                    $value['mitigation'][$index]['measures'] = (object)$mitigation['measures'];

                $ddosMitigationsLevels[$key] = array(
                    'enabled' => $value['enabled'], // change to $value['mitigation_enabled'] in future
                    'mitigation' => $value['mitigation']);
                unset($value['mitigation_enabled']);
                unset($value['mitigation']);
            }
            $ddosMitigationsConfPathname = "{$this->settings->MITIGATION_DIR}/{$objectId}.mitigation_measures.conf";
            $ddosMitigationsConfPathnameTmp = tempnam("/tmp", "mm_conf");
            file_put_contents($ddosMitigationsConfPathnameTmp, $this->prettyPrint(json_encode($ddosMitigations)));
            if ( @md5_file($ddosMitigationsConfPathname) != @md5_file($ddosMitigationsConfPathnameTmp) )
                file_put_contents( $ddosMitigationsConfPathname, file_get_contents($ddosMitigationsConfPathnameTmp) );
            unlink($ddosMitigationsConfPathnameTmp);
        }

        // // TODO TMP Script SET
        // $scripts = array(
        //     'clean' => "{$this->settings->OBJECTS_DIR}/{$objectId}.script.clean",
        //     'critical' => "{$this->settings->OBJECTS_DIR}/{$objectId}.script.critical"
        // );
        // foreach ($scripts as $key => $scriptPathname) {
        //     file_put_contents($scriptPathname, $ddosLevelsSet['ddos_levels'][$key]['mitigation']['script_content']);
        //     unset($ddosLevelsSet['ddos_levels'][$key]['mitigation']['script_content']);
        // }

        $this->setDdosObjectConf($ddosLevelsSet);
        if ( @md5_file($confPathname) != @md5_file($this->ddosObjectConfPath) )
            file_put_contents( $confPathname, file_get_contents($this->ddosObjectConfPath) );
        unlink($this->ddosObjectConfPath);
        // chmod($confPathname, 0666);


        return true;
    }

    //-------------------------------------------------------------------------
    /**
     * Get white list as string from g10.conf
     *
     * @return string
     */
    protected function getWhiteList()
    {
        $g10Conf = $this->getAnalyzerConf();
        $whiteListRaw = array();
        $whiteList = "";
        if ( preg_match_all('/\s*([\/\*\s]+)?white_list\s*=\s*\(([,\/\"\s\d\.\n]+)\);/',
                            $g10Conf['content'], $whiteListRaw, PREG_SET_ORDER) ) {

            foreach ($whiteListRaw as $whiteListContent) {
                if ( !empty($whiteListContent[1]) && $whiteListContent[1][0] == '/') // commented value
                    continue;

                $whiteList = trim( preg_replace('/[\"\s,]+/', "\n", $whiteListContent[2]) );
            }
        }

        return $whiteList;
    }

    //-------------------------------------------------------------------------
    /**
     * Get count of analyzer queues from g10.conf
     *
     * @return integer
     */
    protected function getAnalyzerQueues()
    {
        $dir = $this->settings->ANALYZER_DIR;
        $cmd = "{$dir}/config_get {$dir}/g10.conf int scripts.queues";
        $ret = exec($cmd);
        return !empty($ret) ? intval($ret) : 1;
    }


    //-------------------------------------------------------------------------
    /**
     */
    protected function getAnalyzerConf()
    {
        $confPathname = "{$this->settings->ANALYZER_DIR}/g10.conf";
        if ( !File::isAvailableToRead($confPathname) )
            throw new Exception("Objects:getAnalyzerConf: config file is not available for read");

        return array(
            'pathname' => $confPathname,
            'content' => File::get($confPathname)
        );
    }

    //-------------------------------------------------------------------------
    /**
     * Parse rule params and prepare cmd for blocker
     */
    protected function parseClientRuleToCmd($rule, $isSet)
    {
        // usage:   rules_sender -a set|unset -t block|process|pass|syncookie -s src_ip[[:src_port]/src_mask] -d dst_ip[[:dst_port]/dst_mask] -T rule_timeout[s|m|h|d] host[:hostport].
        $cmd  = " -a " . ($isSet ? "set" : "unset");
        $cmd .= " -t";
        if ( strcasecmp($rule['type_str'], 'block') === 0 )
            $cmd .= " block";
        else if ( strcasecmp($rule['type_str'], 'syncookie') === 0 )
            $cmd .= " pass,syncookie";
        else if ( strcasecmp($rule['type_str'], 'white') === 0 )
            $cmd .= " white";
        else
            throw new Exception("Objects:parseClientRuleToCmd: bad type_str: {$rule['type_str']}");

        $ipMask1 = explode('/', $rule['ip1']);
        $ipMask2 = explode('/', $rule['ip2']);

        // check IPs
        if(strpos($rule['ip1'], '/') !== false)
            Utils::checkIp($rule['ip1'], get_class($this).":". __FUNCTION__);
        if(strpos($rule['ip2'], '/') !== false)
            Utils::checkIp($rule['ip2'], get_class($this).":". __FUNCTION__);

        // At least one of IP is not empty value
        if ( empty($ipMask1[0]) ) {
            if ( empty($ipMask2[0]) )
                throw new Exception("Objects:parseClientRuleToCmd: needed at least one not empty IP");

            $ipMask1[0] = "0.0.0.0"; // ALL
            $ipMask1[1] = "0";
        } else if ( empty($ipMask2[0]) ) {
            $ipMask2[0] = "0.0.0.0"; // ALL
            $ipMask2[1] = "0";
        }

        $cmd .= " -s {$ipMask1[0]}" . (isset($ipMask1[1]) ? "/{$ipMask1[1]}" : "");
        $port1 = $rule['port1'];
        if ( !empty($port1) ) {
            if ( $port1 <= 0 || $port1 >= 65535 )
                throw new Exception("Objects:parseClientRuleToCmd: bad port1 value: '{$port1}'");
            $cmd .= ":{$port1}";
        }

        $cmd .= " -d {$ipMask2[0]}" . (isset($ipMask2[1]) ? "/{$ipMask2[1]}" : "");
        $port2 = $rule['port2'];
        if ( !empty($port2) ) {
            if ( $port2 <= 0 || $port2 >= 65535 )
                throw new Exception("Objects:parseClientRuleToCmd: bad port2 value: '{$port2}'");
            $cmd .= ":{$port2}";
        }

        $duration = $rule['duration'];
        if ( !is_numeric($duration) )
            throw new Exception("Objects:parseClientRuleToCmd: bad duration value: '{$duration}'");
        $cmd .= " -T {$duration}";

        $durationUnits = isset($rule['durationUnits']) ? $rule['durationUnits'] : "";
        if ( !empty($durationUnits) && strpos("smhd", $durationUnits) !== false )
            $cmd .= "{$durationUnits}";

        return $cmd;
    }


    //-------------------------------------------------------------------------
    /**
     * Execute rules_sender cmd on each blocker core
     *
     * @param string $cmd
     *
     */
    protected function executeRuleSenderCmd($cmd)
    {
        // TODO to config

        $blockerConfDir = "{$this->settings->BLOCKER_DIR}/conf";
        // if ( !File::isAvailableToRead( "$blockerConfDir/scripts.conf" ) )
        //     throw new Exception("Objects:executeRuleSenderCmd: unable to read blocker conf");
        // $blockerScriptsConf = json_decode(
        //     @file_get_contents( "$blockerConfDir/scripts.conf" ), true );

        if ( !File::isAvailableToRead( "$blockerConfDir/ddos_mitigation.conf" ) )
            throw new Exception("Objects:executeRuleSenderCmd: unable to read blocker conf");
        $blockerConf = json_decode(
            @file_get_contents( "$blockerConfDir/ddos_mitigation.conf" ), true );
        $blockerPort = $blockerConf['ddos_mitigation']['measures']['listen_port'];
        $blockerIP = $blockerConf['ddos_mitigation']['measures']['listen_ip'];

        // $blockerCores = $blockerScriptsConf['scripts']['working_cores'];
        // $blockerCores = explode('-', $blockerCores);
        // if ( count($blockerCores) > 1 )
        //     $blockerCores = $blockerCores[1] - $blockerCores[0] + 1;
        // else
        //     $blockerCores = 1;
        // $firstCore = $blockerCores[0];
        // $lastCore = count($blockerCores) > 1 ? $blockerCores[1] : $firstCore;

        $cmd_bin  = "{$this->settings->BLOCKER_DIR}/bin/rules_sender {$blockerIP}:{$blockerPort}";
        $descriptorspec = array(
           0 => array("pipe", "r"),  // pipe stdin
           1 => array("pipe", "w"),  // pipe stdout
        );
        $pipes = array();
        $process = proc_open($cmd_bin, $descriptorspec, $pipes);
        if ( is_resource($process) ) {
            fwrite($pipes[0], $cmd);
            fclose($pipes[0]);
            // $out = stream_get_contents($pipes[1]);
            // error_log($out);
            fclose($pipes[1]);
            proc_close($process);
        }

        // error_log("Execute rules cmd(s): " . $cmd_bin );
        // $out = shell_exec( "{$cmd} | {$cmd_bin} 2>&1" );
        // var_dump($out);
        // for ($core = 0; $core < $blockerCores; ++$core) {
        // for ($core = $firstCore; $core <= $lastCore; ++$core) {
        //     $coreCmd = "{$cmd}:" . ($blockerPort + $core);
        //     $out = shell_exec( "$coreCmd 2>&1" );
        //     // var_dump($out);
        // }
    }

    //-------------------------------------------------------------------------
    /**
     * Recursive fill object array via 'cofnig_get' tool
     *
     * @param array &$input
     * @param string $prefix
     */
    protected function getDdosObjectConf(&$input, $prefix = '')
    {
        foreach ($input as $key => &$value) {
            $_prefix = "$prefix.$key";
            $_factor = $this->getDdosLevelValueFactor($key);
            if ( is_array($value) )
                $this->getDdosObjectConf($value, $_prefix);
            else
            {
                $command = "{$this->settings->ANALYZER_DIR}/config_get {$this->ddosObjectConfPath} ".gettype($value)." ".trim($_prefix, '.');
                // error_log($command);
                $var = exec($command);
                if ( is_integer($value) )
                    $value = (integer)$var/$_factor;
                else if (is_bool($value) )
                    $value = ($var === 'true');
                else
                    $value = $var;
            }
        }
    }

    //-------------------------------------------------------------------------
    /**
     * Recursive save object array via 'cofnig_set' tool to file
     *
     * @param array &$input
     * @param string $prefix
     */
    protected function setDdosObjectConf(&$input, $prefix = '')
    {
        // static $prefixKeyValue = array();
        static $advancedEditMode = false;

        // recursive set $prefixKeyValue dictionary
        foreach ($input as $key => &$value) {
            $_prefix = "{$prefix}.{$key}";
            $_factor = $this->getDdosLevelValueFactor($key);
            if ( is_array($value) )
                $this->setDdosObjectConf($value, $_prefix);
            else
            {
                // $keyValue = &$prefixKeyValue;
                // if ( !empty($prefix) )
                // {
                //     if ( !isset($prefixKeyValue[$prefix]) )
                //         $prefixKeyValue[$prefix] = array();

                //     $keyValue = &$prefixKeyValue[$prefix];
                // }
                // $keyValue[$key] = $value;

                static $l2Value = 0;
                static $tcpValue = 0;
                static $udpValue = 0;
                static $l7Value = 0;

                // Save COMMON levels for use in 'simpe' edit mode
                //  save l7 lvl for all l7 protos
                //  save l2 lvl for ip_fragments, icmp
                //  save tcp lvl for tcp_malformed
                switch ($key) {
                    case 'l2':
                        $l2Value = $value; break;
                    case 'tcp':
                        $tcpValue = $value; break;
                    case 'udp':
                        $udpValue = $value; break;
                    case 'l7':
                        $l7Value = $value; break;

                    case 'advanced_edit_mode':
                        $advancedEditMode = $value; break;
                    default: break;
                }

                // !!! IMPORTANT
                // For correct work order is important, see comment in header of 'draft.object.conf'
                if ( !$advancedEditMode ) {
                    switch ($key) {
                        case 'icmp':
                        case 'ip_fragments':
                            $value = $l2Value; break;

                        case 'tcp_malformed':
                            $value = $tcpValue; break;

                        case 'dns':
                        case 'ntp':
                        case 'sip':
                        case 'smtp':
                        case 'ftp':
                        case 'http_bad':
                        case 'http_flood':
                        case 'http_slow':
                            $value = $l7Value; break;
                        default: break;
                    }
                }


                // error_log("{$_prefix}({$key}): {$value}");
                $command = "{$this->settings->ANALYZER_DIR}/config_set {$this->ddosObjectConfPath} ".gettype($value)." ".trim($_prefix, '.')." ";
                if ( is_bool($value) )
                    $command .= ($value ? 'true' : 'false');
                else if ( is_integer($value) )
                    $command .= '"' . $value * $_factor . '"';
                else
                    $command .= "\"{$value}\"";
                exec($command);
            }
        }

        // // TODO not order dependency algo
        // if ($prefix == '') {
        //     $advancedEditMode = isset($prefixKeyValue['advanced_edit_mode']) ?
        //         $prefixKeyValue['advanced_edit_mode'] : false;

        //     // prepare commands
        //     $commands = array();
        //     foreach ($prefixKeyValue as $prefixOrKey => $keyOrValue) {
        //         if ( !is_array($keyOrValue) ) {
        //             $command = "{$this->settings->ANALYZER_DIR}/config_set {$this->ddosObjectConfPath} ".gettype($keyOrValue)." ".trim($prefixOrKey, '.')." ";
        //             if ( is_bool($keyOrValue) )
        //                 $command .= ($keyOrValue ? 'true' : 'false');
        //             else
        //                 $command .= "\"$keyOrValue\"";
        //             $commands[] = $command;
        //         } else {
        //             foreach ($keyOrValue as $key => $value) {
        //             }
        //         }
        //     }

        //     // exec commands
        // }
    }

    private function getDdosLevelValueFactor($key)
    {
        // IMPORTANT!!! if level is max convert it to pps, rps etc.
        // divide by 60 for get
        // multiple to 60 for set
        // because G100 ddos using this value as summary on 60 sec rotate interval
        static $factor = 1;
        switch ($key) {
            case 'max': $factor = 60; break;
            case 'avg': $factor = 1; break;
            default: break;
        }

        return $factor;
    }

    //-------------------------------------------------------------------------
    private function getObjectLastId()
    {
        return file_get_contents( "{$this->settings->OBJECTS_DIR}/last_id" );
    }
    private function setObjectLastId($id)
    {
        return file_put_contents( "{$this->settings->OBJECTS_DIR}/last_id", $id );
    }

    private function hasUserPermissions($id)
    {
        if ($this->users->authUserIsAdmin())
            return true;

        $userObjects = $this->users->objects;
        return $userObjects !== null && in_array($id, $this->users->objects);
    }
}

//-----------------------------------------------------------------------------
