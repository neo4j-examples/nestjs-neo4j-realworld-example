import { Injectable, ExecutionContext, UnauthorizedException, CanActivate } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {

    constructor(private readonly optional: boolean) {
        super()
    }

    static optional() {
        return new JwtAuthGuard(true)
    }

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const superCanActivate = super.canActivate(context)

        if ( typeof superCanActivate === 'boolean' ) {
            return superCanActivate || this.optional
        }
        else if ( superCanActivate instanceof Promise ) {
            // @ts-ignore
            return (<Promise<boolean>> superCanActivate).catch(e => {
                return this.optional
            })
        }

        return superCanActivate;
    }

}