import {Directive, Input, HostBinding} from '@angular/core'
@Directive({
    selector: 'img[default]',
    host: {
      '(error)':'updateUrl()',
      '[src]':'src'
     }
})
  export class ImagePreloadDirective {
    @Input() src:string;
    @Input() default:string;
  
    defaultImage() {
        if(this.default){
            return this.default;
        }
    }
    
    updateUrl() {
      this.src = this.defaultImage();
    }
}