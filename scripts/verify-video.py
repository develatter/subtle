"""Compare original/export structure, compressed audio, and subtitle-free upper image."""
import json
from pathlib import Path
import re
import subprocess
import sys

def call(args):
    return subprocess.check_output(args)
def probe(path):
    return json.loads(call(['ffprobe','-v','error','-show_streams','-of','json',path]))
def frames(path):
    data=json.loads(call(['ffprobe','-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',path]))
    return [f['best_effort_timestamp_time'] for f in data['frames']]
def audio_packets(path):
    return json.loads(call(['ffprobe','-v','error','-select_streams','a:0','-show_packets','-show_entries','packet=pts_time,duration_time,side_data_list','-of','json',path]))['packets']
def audio(path):
    return call(['ffmpeg','-v','error','-i',path,'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-']).decode().strip()
source,output,report=sys.argv[1:4]
a,b=probe(source),probe(output)
v1=next(s for s in a['streams'] if s['codec_type']=='video')
v2=next(s for s in b['streams'] if s['codec_type']=='video')
fields=['width','height','pix_fmt','color_range','color_space','color_transfer','color_primaries','r_frame_rate','time_base']
checks={key:{'source':v1.get(key),'output':v2.get(key),'match':v1.get(key)==v2.get(key)} for key in fields}
f1,f2=frames(source),frames(output)
assert f1==f2,'Los tiempos de los fotogramas cambiaron'
assert all(c['match'] for c in checks.values()),'Cambió una propiedad del vídeo'
audio_equal=audio(source)==audio(output)
assert audio_equal,'El audio cambió'
assert audio_packets(source)==audio_packets(output),'Los tiempos o el priming del audio cambiaron'
# The app default caption center is y=74%; this comparison explicitly excludes that area.
height=int(v1['height']*.60)//2*2
ssim=subprocess.run(['ffmpeg','-v','info','-i',source,'-i',output,'-filter_complex',f'[0:v]crop=iw:{height}:0:0[a];[1:v]crop=iw:{height}:0:0[b];[a][b]ssim','-an','-f','null','-'],capture_output=True,text=True,check=True)
match=re.search(r'SSIM Y:.*?All:([\d.]+)',ssim.stderr)
result={'checks':checks,'frame_count':len(f1),'frame_timestamps_identical':True,'audio_packet_hash_identical':audio_equal,'audio_timestamps_and_priming_identical':True,'ssim_upper_60_percent':float(match[1]) if match else None,'note':'SSIM covers the upper 60% only, excluding default subtitles. This is not a universal perceptual guarantee.'}
Path(report).write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
