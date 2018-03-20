---
layout: post
title: Keeping A Daily Log
permalink: posts/keep-a-daily-log
date: 2018-02-20 00:00:00 +0000
tags:
- cURL
- Slack
- Logs
- cron
---
I have recently started keeping daily log to keep track of TODOs, resolved problems, questions and notes about new things I've learned. It has been a great boon to my productivity but it also ensures I am much more focused and succinct during stand-ups in the morning because I can simply look through the previous day's log for talking points (instead of trying to remember what I did Friday on Monday!).

If anyone is curious here is my setup:

* Generate an empty markdown file with some pre-defined sections
  * So I don't have to create a header for TODOs each time
* Keep the markdown file open throughout the day and periodically fill it in, whenever I hit an issue or accomplish something
* Send it the completed log file to my Slack via the Slack API so I can have it on my phone during stand-up the next morning
  * I have automated this step with a cron job

I generate the template for the log with this function:

```bash
generate_log(){
    now=`date +"%Y-%m-%d"`
    filepath=~/Documents/Logs/$now-log.md
    
    touch $filepath || exit

    log_string="##${now}\n### TODO:\n\n### Stand-Up:\n\n### Questions:\n### Notes:\n"
    echo -e $log_string > $filepath
    macdown $filepath

    send_todays_log | at 18:00
}
```

And send via this script:

```bash
now=`date +"%Y-%m-%d"`
filepath=~/Documents/Logs/$now-log.md
markdown_string=`cat ${filepath}`

export TODAYS_LOG_MD=$markdown_string
curl -X POST -H "Authorization: Bearer ${SLACK_API_TOKEN}" \
-H 'Content-type: application/json' \
--data "$(python -c 'import json, os, sys; print json.dumps({
    "channel": os.getenv("SLACK_RAVELIN_ME"),
    "text": os.getenv("TODAYS_LOG_MD"),
})')" \
https://slack.com/api/chat.postMessage
unset TODAYS_LOG_MD

echo # To create a new line after curl
```

Which is run as a cron job every weekday at 6pm:
\(`crontab -e`)

```bash
SLACK_API_TOKEN=?????
SLACK_RAVELIN_ME=?????
0 18 * * 1-5 /Users/arashoutadi/habitat/scripts/send_todays_log.sh
```