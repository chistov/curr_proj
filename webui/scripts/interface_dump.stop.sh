#!/bin/bash

if [ `whoami` != "root" ]
then
    echo "You must be root to exec $0" 1>&2
    exit 1
fi

killall interface_dump.sh &>/dev/null
sleep 1
killall -9 interface_dump.sh &>/dev/null

exit 0
