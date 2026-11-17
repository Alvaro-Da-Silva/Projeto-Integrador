import { betterAuth } from 'better-auth';
import { pool } from './database.js';
import { authSettings } from './authSettings.js';

export function createBetterAuthOptions(settings,database = pool) {
  return {
    appName:'SISCOTA',database,baseURL:settings.baseURL,basePath:'/api/auth',
    secret:settings.secret,trustedOrigins:settings.origins,
    emailAndPassword:{enabled:true,disableSignUp:true,minPasswordLength:12,maxPasswordLength:256},
    session:{expiresIn:7*24*60*60,updateAge:24*60*60,cookieCache:{enabled:false}},
    user:{changeEmail:{enabled:false},deleteUser:{enabled:false}},
    advanced:{useSecureCookies:settings.production || settings.baseURL.startsWith('https:'),
      defaultCookieAttributes:{httpOnly:true,sameSite:'lax',path:'/'},database:{validateSchema:true}},
    plugins:[],logger:{disabled:true},telemetry:{enabled:false},onAPIError:{throw:true},
    rateLimit:{enabled:true,storage:'memory',window:60,max:100,
      customRules:{'/sign-in/email':{window:60,max:10}}}
  };
}

let instance;
export function getAuth() {
  if (!instance) instance = betterAuth(createBetterAuthOptions(authSettings()));
  return instance;
}
