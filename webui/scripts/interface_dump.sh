#!/bin/bash

if [ `whoami` != "root" ]
then
    echo "You must be root to exec $0" 1>&2
    exit 1
fi
if [[ $# -lt 3 ]]; then
    #                $1     $2     $3        $4
    echo "Usage: $0 <bins> <user> <out_dir> <num_pkts>" 1>&2
    exit 1
fi

#-----------------------------------------------------------------------------

TIMEOUT=5 # seconds
BINS="$1"
AS_USER="$2"
OUT_DIR="$3"
NUM_PKTS=""
if [ -n "$4" ]; then
    NUM_PKTS="$4"
fi

RUN_LOG="${OUT_DIR}/interface_dump.out"
exec 1> "${RUN_LOG}" 2>&1
# sleep 10
# exit 0
#-----------------------------------------------------------------------------

function run_failed
{
    echo "START FAILED: $1"
    exit -1
}

function start()
{
    mkdir -p -m 777 "$OUT_DIR" 2>/dev/null
    chown "$AS_USER":"$AS_USER" "$OUT_DIR"
    cd $OUT_DIR

    local NUM_PKTS_CMD=""
    if [[ -n "${NUM_PKTS}" && "${NUM_PKTS}" -ne 0 ]]; then
        NUM_PKTS_CMD="-n ${NUM_PKTS}"
    fi

    sudo -E -u "$AS_USER" "${1}" "-b ${2}" "$NUM_PKTS_CMD" &
    wait $!
    stop
}

function stop()
{
    kill $! 2> /dev/null
    sleep 1

    while ps -p $! &> /dev/null
    do
        let "TIMEOUT -= 1"
        if [[ ${TIMEOUT} -eq 0 ]]
        then
            break
        fi

        sleep 1
    done

    kill -9 $! 2> /dev/null

    PWD=`pwd`
    if [ "`basename $PWD`" == "`basename $OUT_DIR`" ]; then
        chmod a+w "$PWD"/*
    fi
    $BINS/.G10.start
    exit 0
}

function on_die()
{
    trap '' SIGINT SIGTERM
    stop
}

trap 'on_die' SIGINT SIGTERM
#-----------------------------------------------------------------------------

if (( `$BINS/config_get $BINS/g10.conf int feeders.feeder2_snf.enabled 2>/dev/null || echo 0` ))
then
    pgrep -f "$BINS/snf_dump" > /dev/null && run_failed "snf_dump alreay started"
    BOARD_FIRST=`$BINS/config_get $BINS/g10.conf int snf.board_num`
    BOARDS_COUNT=`$BINS/config_get $BINS/g10.conf int snf.boards_count`

    BOARDS=""
    for (( i = 0; i < $BOARDS_COUNT; i++ )); do
        BOARDS+=$(($BOARD_FIRST + $i))","
    done
    BOARDS=${BOARDS::-1} # remove ","

    start "$BINS/snf_dump" "$BOARDS"

elif (( `$BINS/config_get $BINS/g10.conf int feeders.feeder2_dpdk.enabled 2>/dev/null || echo 0` ))
then
    pgrep -f "$BINS/dpdk_dump" > /dev/null && run_failed "dpdk_dump alreay started"
    run_failed "dpdk_dump is not implemented!"
else
    run_failed "Nothing to start"
fi

exit 0

