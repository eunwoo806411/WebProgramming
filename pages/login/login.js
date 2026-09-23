import {mountLayout} from '../../shared/js/layout.js';
import {signInDemo,signOut} from '../../shared/js/service.js';
import {CONFIG} from '../../shared/js/config.js';
import {pageUrl} from '../../shared/js/routes.js';
await mountLayout('login');
// Actual authentication owner can call completeLogin after the service reports a session.
export function completeLogin(){location.href=pageUrl('main');}
document.querySelector('#dev-login').hidden=!CONFIG.demoLoginEnabled;
async function enter(action){try{await action();completeLogin();}catch(e){document.querySelector('#login-status').textContent=e.message;}}
document.querySelector('#browse').onclick=()=>enter(signOut);
document.querySelector('#test-login').onclick=()=>enter(signInDemo);
document.querySelector('#login-form').onsubmit=e=>e.preventDefault();
