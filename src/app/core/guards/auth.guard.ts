import {inject} from '@angular/core';
import {CanActivateFn,Router} from '@angular/router';
import {AuthService} from '../services/auth.service';
export const authGuard:CanActivateFn=()=>{const auth=inject(AuthService),router=inject(Router);try{auth.headers();return true;}catch{return router.createUrlTree(['/home'],{queryParams:{login:'required'}});}};
