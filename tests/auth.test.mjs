import '@angular/compiler';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {createEnvironmentInjector,runInInjectionContext} from '@angular/core';
import {HttpClient,HttpBackend,HttpErrorResponse} from '@angular/common/http';
import {provideHttpClientTesting,HttpTestingController} from '@angular/common/http/testing';
import {TimeoutError} from 'rxjs';
await mkdir('.data/validation',{recursive:true});
await build({stdin:{contents:`export {AuthService,authErrorMessage,SESSION_KEY} from './src/app/core/services/auth.service';`,resolveDir:fileURLToPath(new URL('../',import.meta.url)),loader:'ts'},bundle:true,packages:'external',platform:'node',format:'esm',outfile:'.data/validation/auth-tests.mjs',tsconfigRaw:{compilerOptions:{experimentalDecorators:true}}});
const {AuthService,authErrorMessage,SESSION_KEY}=await import('../.data/validation/auth-tests.mjs');
const base='http://localhost:8080/api/v1/auth';
class MemoryStorage{constructor(){this.map=new Map();}getItem(k){return this.map.has(k)?this.map.get(k):null;}setItem(k,v){this.map.set(k,String(v));}removeItem(k){this.map.delete(k);}}
const token=(username,minutes=15)=>({authenticated:true,username,accessToken:'access-'+username,refreshToken:'refresh-'+username,expiration:new Date(Date.now()+minutes*60000).toISOString().slice(0,19).replace('T',' ')});
function setup(){
 globalThis.sessionStorage=new MemoryStorage();globalThis.localStorage=new MemoryStorage();
 const injector=createEnvironmentInjector([{provide:HttpClient,useFactory:b=>new HttpClient(b),deps:[HttpBackend]},provideHttpClientTesting()]);
 const auth=runInInjectionContext(injector,()=>new AuthService());
 return {injector,auth,http:injector.get(HttpTestingController)};
}

test('entra com nome de utilizador, guarda só a renovação no separador e sai limpando tudo',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const {injector,auth,http}=setup();try{
  const login=auth.login('admin','segredo-muito-longo');
  const req=http.expectOne(base+'/login');assert.deepEqual(req.request.body,{email:'admin',password:'segredo-muito-longo'});req.flush(token('admin'));await login;
  assert.equal(auth.username(),'admin');assert.equal(auth.headers().get('Authorization'),'Bearer access-admin');
  assert.deepEqual(JSON.parse(sessionStorage.getItem(SESSION_KEY)),{username:'admin',refreshToken:'refresh-admin'});assert.equal(localStorage.getItem(SESSION_KEY),null);
  const out=auth.logout();http.expectOne(base+'/logout').flush(null);await out;
  assert.equal(auth.username(),'');assert.equal(sessionStorage.getItem(SESSION_KEY),null);assert.throws(()=>auth.headers(),/Inicia sessão/);
 }finally{auth.ngOnDestroy();injector.destroy();}
});

test('manter sessão guarda no dispositivo e a sessão é recuperada ao abrir o site',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 let {injector,auth,http}=setup();try{
  const login=auth.login('ana@exemplo.pt','segredo-muito-longo',true);http.expectOne(base+'/login').flush(token('ana@exemplo.pt'));await login;
  assert.ok(localStorage.getItem(SESSION_KEY));assert.equal(sessionStorage.getItem(SESSION_KEY),null);
 }finally{auth.ngOnDestroy();injector.destroy();}
 const saved=localStorage.getItem(SESSION_KEY);({injector,auth,http}=setup());localStorage.setItem(SESSION_KEY,saved);
 try{
  const restore=auth.restore();assert.equal(auth.restoring(),true);
  const req=http.expectOne(base+'/refresh');assert.deepEqual(req.request.body,{username:'ana@exemplo.pt',refreshToken:'refresh-ana@exemplo.pt'});req.flush({...token('ana@exemplo.pt'),refreshToken:'refresh-2'});await restore;
  assert.equal(auth.username(),'ana@exemplo.pt');assert.equal(auth.restoring(),false);assert.equal(JSON.parse(localStorage.getItem(SESSION_KEY)).refreshToken,'refresh-2');
 }finally{auth.ngOnDestroy();injector.destroy();}
});

test('uma renovação recusada termina a sessão sem erro e o acesso é renovado antes de expirar',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 let {injector,auth,http}=setup();sessionStorage.setItem(SESSION_KEY,JSON.stringify({username:'x',refreshToken:'velho'}));
 try{const restore=auth.restore();http.expectOne(base+'/refresh').flush({message:'inválido'},{status:401,statusText:'Unauthorized'});await restore;assert.equal(auth.username(),'');assert.equal(sessionStorage.getItem(SESSION_KEY),null);}
 finally{auth.ngOnDestroy();injector.destroy();}
 ({injector,auth,http}=setup());
 try{
  const login=auth.login('rui@exemplo.pt','segredo-muito-longo');http.expectOne(base+'/login').flush(token('rui@exemplo.pt',15));await login;
  t.mock.timers.tick(14*60000+1000);
  http.expectOne(base+'/refresh').flush({...token('rui@exemplo.pt',15),accessToken:'novo'});await Promise.resolve();await Promise.resolve();
  assert.equal(auth.headers().get('Authorization'),'Bearer novo');
 }finally{auth.ngOnDestroy();injector.destroy();}
});

test('criar conta regista e entra logo a seguir',async()=>{
 const {injector,auth,http}=setup();try{
  const done=auth.register('Ana','ana@exemplo.pt','segredo-muito-longo');
  const reg=http.expectOne(base+'/register');assert.deepEqual(reg.request.body,{fullName:'Ana',email:'ana@exemplo.pt',password:'segredo-muito-longo'});reg.flush({});
  await Promise.resolve();await Promise.resolve();
  http.expectOne(base+'/login').flush(token('ana@exemplo.pt'));await done;assert.equal(auth.username(),'ana@exemplo.pt');
 }finally{auth.ngOnDestroy();injector.destroy();}
});

test('as mensagens de erro distinguem credenciais, ligação, limite e conta existente',()=>{
 const err=(status,error=null)=>new HttpErrorResponse({status,error});
 assert.equal(authErrorMessage(err(401)),'Email ou palavra-passe incorretos.');
 assert.match(authErrorMessage(err(0)),/Sem ligação/);
 assert.match(authErrorMessage(err(429)),/Demasiadas tentativas/);
 assert.match(authErrorMessage(err(409),'register'),/Já existe uma conta/);
 assert.equal(authErrorMessage(err(400,{message:'A senha deve ter entre 12 e 128 caracteres'}),'register'),'A senha deve ter entre 12 e 128 caracteres');
 assert.match(authErrorMessage(err(400),'reset'),/link já não é válido/);
 assert.match(authErrorMessage(new TimeoutError()),/a demorar/);
});
