import zipfile,struct,json,sys
from pathlib import Path
bundle=Path(sys.argv[1])
report=[]
with zipfile.ZipFile(bundle) as z:
    for name in z.namelist():
        if not (name.endswith('.so') and ('/arm64-v8a/' in name or '/x86_64/' in name)): continue
        data=z.read(name)
        assert data[:4]==b'\x7fELF' and data[4]==2,name
        endian='<' if data[5]==1 else '>'
        header=struct.unpack_from(endian+'HHIQQQIHHHHHH',data,16)
        phoff,phentsize,phnum=header[4],header[8],header[9]
        segments=[]
        for i in range(phnum):
            typ,flags,offset,vaddr,paddr,filesz,memsz,align=struct.unpack_from(endian+'IIQQQQQQ',data,phoff+i*phentsize)
            segments.append({'type':typ,'flags':flags,'offset':offset,'vaddr':vaddr,'filesz':filesz,'memsz':memsz,'align':align})
        loads=[s for s in segments if s['type']==1]
        relros=[s for s in segments if s['type']==0x6474e552]
        relro_results=[]
        for r in relros:
            end=r['vaddr']+r['memsz']
            rounded_end=(end+0x3fff)//0x4000*0x4000
            dedicated=any(l['vaddr']==r['vaddr'] and l['memsz']==r['memsz'] for l in loads)
            subsequent_writable_overlap=any((l['flags']&2) and max(l['vaddr'],end)<min(l['vaddr']+l['memsz'],rounded_end) for l in loads)
            aligned=end%0x4000==0
            relro_results.append({'vaddr':hex(r['vaddr']),'memsz':hex(r['memsz']),'end':hex(end),'aligned16KB':aligned,'dedicatedLoad':dedicated,'subsequentWritableOverlap':subsequent_writable_overlap,'pass':aligned or (dedicated and not subsequent_writable_overlap)})
        report.append({'library':name,'loadAlignments':[s['align'] for s in loads],'loadAlignmentPass':bool(loads) and all(s['align']>=16384 and (s['vaddr']-s['offset'])%16384==0 for s in loads),'relro':relro_results,'relroPass':all(r['pass'] for r in relro_results)})
result={'bundle':str(bundle),'libraryCount64Bit':len(report),'allLoadAlignmentsPass':bool(report) and all(x['loadAlignmentPass'] for x in report),'allRelroPass':bool(report) and all(x['relroPass'] for x in report),'libraries':report}
out=bundle.parent/'build-6'/'elf-alignment.json'
out.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='libraries'}))
for r in report:
    if not r['loadAlignmentPass'] or not r['relroPass']: print(json.dumps(r))
