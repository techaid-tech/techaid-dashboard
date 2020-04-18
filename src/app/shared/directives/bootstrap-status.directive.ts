import { Directive, Self, Input  } from "@angular/core";
import { NgControl } from "@angular/forms";

const controlStatusHost = {
    "[class.is-valid]": "bsClassValid",
    "[class.is-invalid]": "bsClassInvalid"
};

@Directive({ selector: ".bs-validate[formControlName],.bs-validate[ngModel],.bs-validate[formControl]", host: controlStatusHost })
export class BootstrapStatusDirective  {
    public constructor(@Self() private control: NgControl) {
    }

    @Input('bs-valid')
    show_valid : boolean = false;

    canCheck() : boolean {
        if (this.control && this.control.control == null) {
            return false;
        }

        if(this.control.pristine) {
            return false;
        }

        return true;
    }

    get bsClassValid(): boolean {
        return this.show_valid && this.canCheck() && this.control.control.valid;
    }

    get bsClassInvalid(): boolean {
        return this.canCheck() && this.control.control.invalid;;
    }
}