#!/bin/bash

if [ `whoami` != "root" ]
then
    echo "You must be root to exec $0" 1>&2
    exit 1
fi

ps -U root u | grep "[i]nterface_dump.sh"
exit $?
