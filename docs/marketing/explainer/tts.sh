#!/bin/bash
# usage: ./tts.sh <voice> <engine>
set -e
cd "$(dirname "$0")"
voice=$1; engine=$2; out=build/vo/$voice; mkdir -p $out
n=$(node -e 'console.log(require("./lines.json").length)')
for i in $(seq 0 $((n-1))); do
  id=$(node -e "console.log(require('./lines.json')[$i].id)")
  text=$(node -e "console.log(require('./lines.json')[$i].text.replace(/QuietJar/g,'Quiet Jar'))")
  aws polly synthesize-speech --region us-east-1 --engine $engine --voice-id $voice --output-format mp3 --sample-rate 24000 --text "$text" $out/$id.mp3 >/dev/null
  aws polly synthesize-speech --region us-east-1 --engine $engine --voice-id $voice --output-format json --speech-mark-types word --text "$text" $out/$id.marks.json >/dev/null 2>&1 || true
done
