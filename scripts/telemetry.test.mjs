import test from 'node:test';
import assert from 'node:assert/strict';
import {collect,render} from './telemetry.mjs';
const graph={data:{user:{repositories:{totalCount:7},contributionsCollection:{contributionCalendar:{totalContributions:210},restrictedContributionsCount:42}}}};
const reply=value=>({ok:true,json:async()=>value});
test('public fallback labels missing private counts without inventing zeroes',async()=>{
 const d=await collect({token:'fixture',privateScope:false,request:async()=>reply(graph)});
 assert.equal(d.repositories,7);assert.equal(d.privateRepositories,null);assert.equal(d.privateContributions,null);
 assert.match(d.status,/PUBLIC/);assert.match(render(d),/Requires METRICS_TOKEN/);
});
test('authenticated inventory paginates, filters ownership and publishes only aggregates',async()=>{
 let pages=0;
 const repo={owner:{login:'RocketSloth'},private:true,name:'DO_NOT_PUBLISH'};
 const request=async url=>{
  if(url.endsWith('/user'))return reply({login:'RocketSloth'});
  if(url.endsWith('/graphql'))return reply(graph);
  pages++;
  return reply(pages===1?Array.from({length:100},()=>repo):[{...repo,private:false},{owner:{login:'someone-else'},private:true}]);
 };
 const d=await collect({token:'fixture',privateScope:true,request});
 assert.equal(pages,2);assert.equal(d.repositories,101);assert.equal(d.privateRepositories,100);
 assert.equal(d.contributions,210);assert.equal(d.privateContributions,42);
 assert.doesNotMatch(render(d),/DO_NOT_PUBLISH|fixture/);
});
test('wrong identity and GraphQL errors fail instead of generating false telemetry',async()=>{
 await assert.rejects(collect({token:'fixture',privateScope:true,request:async()=>reply({login:'other'})}),/must belong/);
 await assert.rejects(collect({token:'fixture',privateScope:false,request:async()=>reply({errors:[{message:'forbidden'}]})}),/GraphQL/);
 await assert.rejects(collect({token:'fixture',privateScope:false,request:async()=>({ok:false,status:403})}),/403/);
});
test('SVG escapes external labels',()=>{
 assert.match(render({status:'<blocked & unavailable>'}),/&lt;blocked &amp; unavailable&gt;/);
});
