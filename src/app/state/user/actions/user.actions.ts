import { User } from '../user.state';

export class LoginUser {
    static readonly type = '[User API] Login User';
    constructor() { }
}

export class LogoutUser {
    static readonly type = '[User API] Logout User';
    constructor() { }
}
