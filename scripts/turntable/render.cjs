const p=require('/tmp/kv/node_modules/puppeteer-core');const fs=require('fs');
const [,,n,w,only]=process.argv;
(async()=>{const b=await p.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const pg=await b.newPage();await pg.setViewport({width:+w,height:Math.round(w*9/16)});
pg.on('console',m=>console.log('console',m.text()));pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.goto(`http://127.0.0.1:8740/scene.html?w=${w}`);await pg.waitForFunction('window.ready',{timeout:120000});
fs.mkdirSync('frames',{recursive:true});
const list=only?only.split(',').map(Number):[...Array(+n).keys()];
for(const i of list){const url=await pg.evaluate((i,n)=>renderFrame(i,n),i,+n);fs.writeFileSync(`frames/${String(i+1).padStart(3,'0')}.png`,Buffer.from(url.split(',')[1],'base64'));}
await b.close();})();
