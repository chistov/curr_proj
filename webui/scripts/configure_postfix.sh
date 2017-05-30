#!/bin/bash
relayhost=$1
user=$2
passwd=$3
sed -i -e "s/relayhost = .*/relayhost = $relayhost/g" /etc/postfix/main.cf
echo "$relayhost $user:$passwd" > /etc/postfix/sasl_passwd
postmap /etc/postfix/sasl_passwd
service postfix restart
