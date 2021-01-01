import { Component, AfterViewInit, Renderer2, Inject, Input } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Component({
    selector: 'ngx-commento',
    template: `
      <div id="commento" [attr.data-page-id]="pageId"></div>
    `,
    styles: []
  })
  export class NgxCommentoComponent {
    constructor(private _renderer2: Renderer2, @Inject(DOCUMENT) private _document) {}

    @Input()
    pageId =  '';

    ngAfterViewInit() {
        this.initCommento();
    }

    ngOnDestroy() {
        this.removeChild();
    }

    initCommento() {
        this.removeChild();
        const s = this._renderer2.createElement('script');
        s.src = 'https://commento.techaid.ju.ma/js/commento.js';
        s.id = 'commento-js';
        this._renderer2.appendChild(this._document.body, s);
    }

    removeChild() {
        const script = window.document.getElementById('commento-js');
        if (script) {
            this._renderer2.removeChild(this._document.body, script);
        }
    }
  }

