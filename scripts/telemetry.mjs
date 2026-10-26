import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const owner = 'RocketSloth';
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function render(d) {
 const cards=[
 ['CONTRIBUTIONS / 12 MONTHS',d.contributions,'GitHub contribution calendar'],
 ['RESTRICTED CONTRIBUTIONS',d.privateContributions,'GitHub anonymous contribution count'],
 ['OWNED REPOSITORIES',d.repositories,d.privateScope?'Repositories visible to the token':'Public repositories only'],
 ['PRIVATE REPOSITORIES',d.privateRepositories,d.privateScope?'Names and contents withheld':'Requires METRICS_TOKEN']];
 return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="350" viewBox="0 0 960 350" role="img" aria-labelledby="title desc"><title id="title">RocketSloth engineering telemetry</title><desc id="desc">${esc(d.status)}. ${cards.map(([label,value])=>label+': '+(value??'unavailable')).join('. ')}</desc><rect width="960" height="350" rx="6" fill="#0c141c"/><path d="M0 0H960V5H0Z" fill="#56dcf2"/><g font-family="Consolas, monospace"><text x="28" y="39" fill="#56dcf2" font-size="14" letter-spacing="2">02 / ENGINEERING TELEMETRY</text><text x="28" y="65" fill="#a5bac8" font-size="12">${esc(d.status)}</text>${cards.map(([label,value,note],i)=>{const x=28+i%2*466,y=86+Math.floor(i/2)*111;return `<g transform="translate(${x} ${y})"><path d="M0 0H440V94H0Z" fill="#14212c" stroke="#304553"/><path d="M0 0H4V94H0Z" fill="${i%2?'#eab35a':'#56dcf2'}"/><text x="19" y="23" fill="#a5bac8" font-size="11" letter-spacing="1">${label}</text><text x="19" y="57" fill="#eef7fc" font-size="29">${value==null?'—':esc(Number(value).toLocaleString('en-US'))}</text><text x="19" y="79" fill="#a5bac8" font-size="11">${note}</text></g>`;}).join('')}<text x="28" y="332" fill="#a5bac8" font-size="11">${esc(d.updated?'UPDATED '+d.updated+' UTC':'AWAITING FIRST WORKFLOW RUN')} / NO PRIVATE PROJECT DETAILS PUBLISHED</text></g></svg>\n`;
}
export async function collect({token,privateScope,request=fetch,now=new Date()}) {
 if(!token) throw new Error('A GitHub token is required.');
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
 async function api(url,options={}) {
  const r=await request(url,{...options,headers:{...headers,...options.headers}});
  if(!r.ok) throw new Error('GitHub request failed ('+r.status+'); existing telemetry retained.');
  const result=await r.json();
  if(result.errors) throw new Error('GitHub GraphQL request failed; check token permissions.');
  return result;
 }
 if(privateScope) {
  const viewer=await api('https://api.github.com/user');
  if(viewer.login.toLowerCase()!==owner.toLowerCase()) throw new Error('METRICS_TOKEN must belong to RocketSloth.');
 }
 const from=new Date(now);from.setUTCFullYear(from.getUTCFullYear()-1);
 const result=await api('https://api.github.com/graphql',{method:'POST',body:JSON.stringify({
 query:'query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){repositories(privacy:PUBLIC,ownerAffiliations:OWNER){totalCount} contributionsCollection(from:$from,to:$to){contributionCalendar{totalContributions} restrictedContributionsCount}}}',
 variables:{login:owner,from:from.toISOString(),to:now.toISOString()}})});
 if(!result.data?.user) throw new Error('GitHub user was not returned.');
 const u=result.data.user;
 let repositories=u.repositories.totalCount,privateRepositories=null;
 if(privateScope) {
  repositories=0;privateRepositories=0;
  for(let page=1;;page++) {
   const batch=await api('https://api.github.com/user/repos?affiliation=owner&per_page=100&page='+page);
   if(!Array.isArray(batch)) throw new Error('Invalid repository response.');
   for(const repo of batch) {
    if(repo.owner.login.toLowerCase()!==owner.toLowerCase()) continue;
    repositories++;if(repo.private) privateRepositories++;
   }
   if(batch.length<100) break;
  }
 }
 return {contributions:u.contributionsCollection.contributionCalendar.totalContributions,
 privateContributions:privateScope?u.contributionsCollection.restrictedContributionsCount:null,
 repositories,privateRepositories,privateScope,
 status:privateScope?'AUTHENTICATED / coverage depends on token access and contribution settings':'PUBLIC COVERAGE / configure METRICS_TOKEN to include private work',
 updated:now.toISOString().slice(0,16).replace('T',' ')};
}
async function main() {
 const d=process.argv.includes('--placeholder')?{status:'TELEMETRY PENDING / configure METRICS_TOKEN for private coverage',privateScope:false}:await collect({token:process.env.METRICS_TOKEN||process.env.GITHUB_TOKEN,privateScope:Boolean(process.env.METRICS_TOKEN)});
 await mkdir('assets',{recursive:true});await writeFile('assets/telemetry.svg',render(d));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) main().catch(e=>{console.error(e.message);process.exitCode=1;});
